#import "system_audio.h"

#import <AVFoundation/AVFoundation.h>
#import <CoreMedia/CoreMedia.h>
#import <ScreenCaptureKit/ScreenCaptureKit.h>
#import <dispatch/dispatch.h>
#import <stdio.h>
#import <stdlib.h>
#import <string.h>

static nw_system_audio_callback_t g_callback = NULL;
static SCStream *g_stream = NULL;
static id<SCStreamOutput> g_output = NULL;
static dispatch_queue_t g_queue = NULL;

static BOOL nw_extract_float_samples(CMSampleBufferRef sampleBuffer, float **out, uint32_t *out_count) {
    if (CMSampleBufferGetNumSamples(sampleBuffer) == 0) {
        return NO;
    }

    CMBlockBufferRef blockBuffer = NULL;
    AudioBufferList audioBufferList;
    memset(&audioBufferList, 0, sizeof(audioBufferList));

    OSStatus status = CMSampleBufferGetAudioBufferListWithRetainedBlockBuffer(
        sampleBuffer,
        NULL,
        &audioBufferList,
        sizeof(audioBufferList),
        NULL,
        NULL,
        kCMSampleBufferFlag_AudioBufferList_Assure16ByteAlignment,
        &blockBuffer);

    if (status != noErr) {
        if (blockBuffer) {
            CFRelease(blockBuffer);
        }
        return NO;
    }

    AudioBufferList *mutableList = &audioBufferList;
    UInt32 bufferCount = mutableList->mNumberBuffers;

    if (bufferCount == 1) {
        AudioBuffer *buffer = &mutableList->mBuffers[0];
        if (buffer->mData == NULL || buffer->mDataByteSize == 0) {
            if (blockBuffer) {
                CFRelease(blockBuffer);
            }
            return NO;
        }
        uint32_t count = (uint32_t)(buffer->mDataByteSize / sizeof(float));
        float *copy = (float *)malloc(count * sizeof(float));
        if (copy == NULL) {
            if (blockBuffer) {
                CFRelease(blockBuffer);
            }
            return NO;
        }
        memcpy(copy, buffer->mData, count * sizeof(float));
        *out = copy;
        *out_count = count;
        if (blockBuffer) {
            CFRelease(blockBuffer);
        }
        return YES;
    }

    uint32_t maxSamples = 0;
    float **channels = (float **)calloc(bufferCount, sizeof(float *));
    uint32_t *channelCounts = (uint32_t *)calloc(bufferCount, sizeof(uint32_t));
    if (channels == NULL || channelCounts == NULL) {
        free(channels);
        free(channelCounts);
        if (blockBuffer) {
            CFRelease(blockBuffer);
        }
        return NO;
    }

    for (UInt32 i = 0; i < bufferCount; i++) {
        AudioBuffer *buffer = &mutableList->mBuffers[i];
        if (buffer->mData == NULL || buffer->mDataByteSize == 0) {
            continue;
        }
        uint32_t count = (uint32_t)(buffer->mDataByteSize / sizeof(float));
        float *copy = (float *)malloc(count * sizeof(float));
        if (copy == NULL) {
            for (UInt32 j = 0; j < i; j++) {
                free(channels[j]);
            }
            free(channels);
            free(channelCounts);
            if (blockBuffer) {
                CFRelease(blockBuffer);
            }
            return NO;
        }
        memcpy(copy, buffer->mData, count * sizeof(float));
        channels[i] = copy;
        channelCounts[i] = count;
        if (count > maxSamples) {
            maxSamples = count;
        }
    }

    if (maxSamples == 0) {
        free(channels);
        free(channelCounts);
        if (blockBuffer) {
            CFRelease(blockBuffer);
        }
        return NO;
    }

    uint32_t total = maxSamples * bufferCount;
    float *interleaved = (float *)calloc(total, sizeof(float));
    if (interleaved == NULL) {
        for (UInt32 i = 0; i < bufferCount; i++) {
            free(channels[i]);
        }
        free(channels);
        free(channelCounts);
        if (blockBuffer) {
            CFRelease(blockBuffer);
        }
        return NO;
    }

    for (uint32_t frame = 0; frame < maxSamples; frame++) {
        for (UInt32 ch = 0; ch < bufferCount; ch++) {
            float sample = 0.0f;
            if (channels[ch] != NULL && frame < channelCounts[ch]) {
                sample = channels[ch][frame];
            }
            interleaved[frame * bufferCount + ch] = sample;
        }
    }

    for (UInt32 i = 0; i < bufferCount; i++) {
        free(channels[i]);
    }
    free(channels);
    free(channelCounts);
    if (blockBuffer) {
        CFRelease(blockBuffer);
    }

    *out = interleaved;
    *out_count = total;
    return YES;
}

@interface NWSystemAudioOutput : NSObject <SCStreamOutput>
@end

@implementation NWSystemAudioOutput

- (void)stream:(SCStream *)stream
    didOutputSampleBuffer:(CMSampleBufferRef)sampleBuffer
                   ofType:(SCStreamOutputType)type {
    (void)stream;
    if (type != SCStreamOutputTypeAudio || g_callback == NULL) {
        return;
    }

    float *interleaved = NULL;
    uint32_t count = 0;
    if (!nw_extract_float_samples(sampleBuffer, &interleaved, &count) || count == 0) {
        return;
    }
    g_callback(interleaved, count, 48000, 2);
    free(interleaved);
}

@end

static void nw_start_capture(nw_system_audio_callback_t callback, void (^done)(int32_t code)) {
    if (g_stream != NULL) {
        done(0);
        return;
    }

    g_callback = callback;

    [SCShareableContent getShareableContentExcludingDesktopWindows:NO
                                             onScreenWindowsOnly:YES
                                               completionHandler:^(SCShareableContent *content, NSError *error) {
        if (error != nil) {
            fprintf(stderr, "SystemAudio: shareable content error: %s\n",
                    error.localizedDescription.UTF8String);
            done(-1);
            return;
        }

        SCDisplay *display = content.displays.firstObject;
        if (display == nil) {
            fputs("SystemAudio: no displays available\n", stderr);
            done(-2);
            return;
        }

        SCContentFilter *filter = [[SCContentFilter alloc] initWithDisplay:display excludingWindows:@[]];
        SCStreamConfiguration *config = [[SCStreamConfiguration alloc] init];
        config.capturesAudio = YES;
        config.excludesCurrentProcessAudio = YES;
        config.sampleRate = 48000;
        config.channelCount = 2;
        config.width = 2;
        config.height = 2;
        config.minimumFrameInterval = CMTimeMake(1, 1);

        NWSystemAudioOutput *output = [[NWSystemAudioOutput alloc] init];
        SCStream *stream = [[SCStream alloc] initWithFilter:filter configuration:config delegate:nil];

        if (g_queue == NULL) {
            g_queue = dispatch_queue_create("com.notewise.system-audio", DISPATCH_QUEUE_SERIAL);
        }

        NSError *addError = nil;
        if (![stream addStreamOutput:output type:SCStreamOutputTypeAudio sampleHandlerQueue:g_queue error:&addError]) {
            fprintf(stderr, "SystemAudio: addStreamOutput error: %s\n",
                    addError.localizedDescription.UTF8String);
            done(-4);
            return;
        }

        [stream startCaptureWithCompletionHandler:^(NSError *startError) {
            if (startError != nil) {
                fprintf(stderr, "SystemAudio: startCapture error: %s\n",
                        startError.localizedDescription.UTF8String);
                done(-3);
                return;
            }
            g_stream = stream;
            g_output = output;
            done(0);
        }];
    }];
}

static void nw_stop_capture(void (^done)(int32_t code)) {
    if (g_stream == NULL) {
        done(0);
        return;
    }

    SCStream *stream = g_stream;
    g_stream = NULL;
    g_output = NULL;
    g_callback = NULL;

    [stream stopCaptureWithCompletionHandler:^(NSError *error) {
        (void)error;
        done(0);
    }];
}

int32_t nw_system_audio_start(nw_system_audio_callback_t callback) {
    if (g_queue == NULL) {
        g_queue = dispatch_queue_create("com.notewise.system-audio", DISPATCH_QUEUE_SERIAL);
    }

    __block int32_t result = -99;
    dispatch_semaphore_t sem = dispatch_semaphore_create(0);

    dispatch_async(g_queue, ^{
        nw_start_capture(callback, ^(int32_t code) {
            result = code;
            dispatch_semaphore_signal(sem);
        });
    });

    dispatch_time_t timeout = dispatch_time(DISPATCH_TIME_NOW, (int64_t)(15 * NSEC_PER_SEC));
    dispatch_semaphore_wait(sem, timeout);
    return result;
}

int32_t nw_system_audio_stop(void) {
    if (g_queue == NULL) {
        return 0;
    }

    __block int32_t result = -99;
    dispatch_semaphore_t sem = dispatch_semaphore_create(0);

    dispatch_async(g_queue, ^{
        nw_stop_capture(^(int32_t code) {
            result = code;
            dispatch_semaphore_signal(sem);
        });
    });

    dispatch_time_t timeout = dispatch_time(DISPATCH_TIME_NOW, (int64_t)(5 * NSEC_PER_SEC));
    dispatch_semaphore_wait(sem, timeout);
    return result;
}

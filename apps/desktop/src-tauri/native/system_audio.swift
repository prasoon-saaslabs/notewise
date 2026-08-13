import AVFoundation
import CoreMedia
import Foundation
import ScreenCaptureKit

private final class SystemAudioOutput: NSObject, SCStreamOutput {
    private let callback: (@convention(c) (UnsafePointer<Float>?, UInt32, UInt32, UInt16) -> Void)

    init(callback: @escaping @convention(c) (UnsafePointer<Float>?, UInt32, UInt32, UInt16) -> Void) {
        self.callback = callback
    }

    func stream(
        _ stream: SCStream,
        didOutputSampleBuffer sampleBuffer: CMSampleBuffer,
        of outputType: SCStreamOutputType
    ) {
        guard outputType == .audio else { return }
        guard let samples = Self.extractFloatSamples(from: sampleBuffer), !samples.isEmpty else { return }
        samples.withUnsafeBufferPointer { buffer in
            callback(buffer.baseAddress, UInt32(buffer.count), 48_000, 2)
        }
    }

    private static func extractFloatSamples(from sampleBuffer: CMSampleBuffer) -> [Float]? {
        guard CMSampleBufferGetNumSamples(sampleBuffer) > 0 else { return nil }

        var blockBuffer: CMBlockBuffer?
        var audioBufferList = AudioBufferList()
        let status = CMSampleBufferGetAudioBufferListWithRetainedBlockBuffer(
            sampleBuffer,
            bufferListSizeNeededOut: nil,
            bufferListOut: &audioBufferList,
            bufferListSize: MemoryLayout<AudioBufferList>.size,
            blockBufferAllocator: nil,
            blockBufferMemoryAllocator: nil,
            flags: kCMSampleBufferFlag_AudioBufferList_Assure16ByteAlignment,
            blockBufferOut: &blockBuffer
        )
        guard status == noErr else { return nil }

        let buffers = UnsafeMutableAudioBufferListPointer(&audioBufferList)
        if buffers.count == 1 {
            let buffer = buffers[0]
            guard let data = buffer.mData else { return nil }
            let count = Int(buffer.mDataByteSize) / MemoryLayout<Float>.size
            if count == 0 { return nil }
            let ptr = data.bindMemory(to: Float.self, capacity: count)
            return Array(UnsafeBufferPointer(start: ptr, count: count))
        }

        var channelData: [[Float]] = []
        var maxSamples = 0
        for buffer in buffers {
            guard let data = buffer.mData else { continue }
            let count = Int(buffer.mDataByteSize) / MemoryLayout<Float>.size
            if count == 0 { continue }
            let ptr = data.bindMemory(to: Float.self, capacity: count)
            channelData.append(Array(UnsafeBufferPointer(start: ptr, count: count)))
            maxSamples = max(maxSamples, count)
        }
        if channelData.isEmpty { return nil }

        var interleaved = [Float]()
        interleaved.reserveCapacity(maxSamples * channelData.count)
        for i in 0..<maxSamples {
            for channel in channelData {
                interleaved.append(i < channel.count ? channel[i] : 0)
            }
        }
        return interleaved
    }
}

private final class SystemAudioSession {
    static let shared = SystemAudioSession()

    private var stream: SCStream?
    private var output: SystemAudioOutput?
    private let queue = DispatchQueue(label: "com.notewise.system-audio", qos: .userInitiated)

    func start(
        callback: @escaping @convention(c) (UnsafePointer<Float>?, UInt32, UInt32, UInt16) -> Void,
        completion: @escaping (Int32) -> Void
    ) {
        queue.async {
            if self.stream != nil {
                completion(0)
                return
            }

            SCShareableContent.getExcludingDesktopWindows(false, onScreenWindowsOnly: true) { content, error in
                if let error {
                    fputs("SystemAudio: shareable content error: \(error.localizedDescription)\n", stderr)
                    completion(-1)
                    return
                }
                guard let display = content?.displays.first else {
                    fputs("SystemAudio: no displays available\n", stderr)
                    completion(-2)
                    return
                }

                let filter = SCContentFilter(display: display, excludingWindows: [])
                let config = SCStreamConfiguration()
                config.capturesAudio = true
                config.excludesCurrentProcessAudio = true
                config.sampleRate = 48_000
                config.channelCount = 2
                // ScreenCaptureKit requires a video surface — use a tiny dummy stream.
                config.width = 2
                config.height = 2
                config.minimumFrameInterval = CMTime(value: 1, timescale: 1)

                let output = SystemAudioOutput(callback: callback)
                let stream = SCStream(filter: filter, configuration: config, delegate: nil)
                do {
                    try stream.addStreamOutput(output, type: .audio, sampleHandlerQueue: self.queue)
                    stream.startCapture { startError in
                        if let startError {
                            fputs("SystemAudio: startCapture error: \(startError.localizedDescription)\n", stderr)
                            completion(-3)
                            return
                        }
                        self.stream = stream
                        self.output = output
                        completion(0)
                    }
                } catch {
                    fputs("SystemAudio: addStreamOutput error: \(error.localizedDescription)\n", stderr)
                    completion(-4)
                }
            }
        }
    }

    func stop(completion: @escaping (Int32) -> Void) {
        queue.async {
            guard let stream = self.stream else {
                completion(0)
                return
            }
            stream.stopCapture { _ in
                self.stream = nil
                self.output = nil
                completion(0)
            }
        }
    }
}

@_cdecl("nw_system_audio_start")
public func nw_system_audio_start(
    callback: @escaping @convention(c) (UnsafePointer<Float>?, UInt32, UInt32, UInt16) -> Void
) -> Int32 {
    let sem = DispatchSemaphore(value: 0)
    var result: Int32 = -99
    SystemAudioSession.shared.start(callback: callback) { code in
        result = code
        sem.signal()
    }
    _ = sem.wait(timeout: .now() + 15)
    return result
}

@_cdecl("nw_system_audio_stop")
public func nw_system_audio_stop() -> Int32 {
    let sem = DispatchSemaphore(value: 0)
    var result: Int32 = -99
    SystemAudioSession.shared.stop { code in
        result = code
        sem.signal()
    }
    _ = sem.wait(timeout: .now() + 5)
    return result
}

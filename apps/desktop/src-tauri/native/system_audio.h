#ifndef NW_SYSTEM_AUDIO_H
#define NW_SYSTEM_AUDIO_H

#include <stdint.h>

typedef void (*nw_system_audio_callback_t)(
    const float *samples,
    uint32_t count,
    uint32_t sample_rate,
    uint16_t channels);

int32_t nw_system_audio_start(nw_system_audio_callback_t callback);
int32_t nw_system_audio_stop(void);

#endif

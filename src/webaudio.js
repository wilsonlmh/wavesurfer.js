'use strict';

WaveSurfer.WebAudio = {
    scriptBufferSize: 256,

    init: function (params) {
        if (!(window.AudioContext || window.webkitAudioContext)) {
            throw new Error(
                'wavesurfer.js: your browser doesn\'t support WebAudio'
            );
        }
        this.params = params;
        this.ac = params.audioContext || this.getAudioContext();

        this.createVolumeNode();
        //this.createScriptNode();
    },

    setFilter: function (filterNode) {
        this.filterNode && this.filterNode.disconnect();
        this.gainNode.disconnect();
        if (filterNode) {
            filterNode.connect(this.ac.destination);
            this.gainNode.connect(filterNode);
        } else {
            this.gainNode.connect(this.ac.destination);
        }
        this.filterNode = filterNode;
    },

    createScriptNode: function () {
        var my = this;
        var bufferSize = this.scriptBufferSize;
        if (this.ac.createScriptProcessor) {
            this.scriptNode = this.ac.createScriptProcessor(bufferSize);
        } else {
            this.scriptNode = this.ac.createJavaScriptNode(bufferSize);
        }
        this.scriptNode.connect(this.ac.destination);
        this.scriptNode.onaudioprocess = function () {
            if (!my.isPaused()) {
                var time = my.getCurrentTime();
                if (time > my.scheduledPause) {
                    my.pause();
                }
                my.fireEvent('audioprocess', time);
            }
        };
    },

    /**
     * Create the gain node needed to control the playback volume.
     */
    createVolumeNode: function () {
        // Create gain node using the AudioContext
        if (this.ac.createGain) {
            this.gainNode = this.ac.createGain();
        } else {
            this.gainNode = this.ac.createGainNode();
        }
        // Add the gain node to the graph
        this.gainNode.connect(this.ac.destination);
    },

    /**
     * Set the gain to a new value.
     *
     * @param {Number} newGain The new gain, a floating point value
     * between 0 and 1. 0 being no gain and 1 being maximum gain.
     */
    setVolume: function (newGain) {
        this.gainNode.gain.value = newGain;
    },

    /**
     * Get the current gain.
     *
     * @returns {Number} The current gain, a floating point value
     * between 0 and 1. 0 being no gain and 1 being maximum gain.
     */
    getVolume: function () {
        return this.gainNode.gain.value;
    },

    /**
     * Create a media element source.
     */
    load: function (url) {
        var my = this;
        this.decode(url);

        var audio = this.getAudioElement(url);
        audio.addEventListener('canplay', function () {
            my.source = my.ac.createMediaElementSource(audio);
            my.source.connect(my.ac.destination);
            my.fireEvent('ready');
        });
    },

    decode: function (url) {
        var my = this;
        var audio = this.getAudioElement(url);
        audio.addEventListener('canplay', function () {
            var ac =  new (
                window.OfflineAudioContext || window.webkitOfflineAudioContext
            )(1, audio.duration * my.ac.sampleRate, my.ac.sampleRate);
            var source = ac.createMediaElementSource(audio);
            source.connect(ac.destination);
            ac.startRendering();
            ac.addEventListener('complete', function (e) {
                source.disconnect();
                my.fireEvent('decoded', e.renderedBuffer.getChannelData(0));
            });
            audio.play();
        });
    },

    getAudioElement: function (url) {
        var audio = new Audio();
        audio.autoplay = false;
        audio.src = url;
        return audio;
    },

    isPaused: function () {
        return !this.source || this.source.mediaElement.paused;
    },

    getDuration: function () {
        return this.source.mediaElement.duration;
    },

    /**
     * Plays the audio.
     */
    play: function (start) {
        if (start != null) {
            this.source.mediaElement.currentTime = start;
        }
        this.source.mediaElement.play();
        this.fireEvent('play');
    },

    /**
     * Pauses the audio.
     */
    pause: function () {
        this.source.mediaElement.pause();
        this.fireEvent('pause');
    },

    getPlayedPercents: function () {
        var duration = this.getDuration();
        return (this.getCurrentTime() / duration) || 0;
    },

    getCurrentTime: function () {
        return this.source.mediaElement.currentTime;
    },

    audioContext: null,
    getAudioContext: function () {
        if (!WaveSurfer.WebAudio.audioContext) {
            WaveSurfer.WebAudio.audioContext = new (
                window.AudioContext || window.webkitAudioContext
            );
        }
        return WaveSurfer.WebAudio.audioContext;
    }
};

WaveSurfer.util.extend(WaveSurfer.WebAudio, WaveSurfer.Observer);

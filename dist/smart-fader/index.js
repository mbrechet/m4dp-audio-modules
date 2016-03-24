'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _index = require('../core/index.js');

var _index2 = _interopRequireDefault(_index);

var _utils = require('../core/utils.js');

var _utils2 = _interopRequireDefault(_utils);

var _compressor = require('../dsp/compressor.js');

var _compressor2 = _interopRequireDefault(_compressor);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /************************************************************************************/
/*!
 *   @file       index.js
 *   @brief      This class implements the so-called SmartFader module of M4DP
 *   @author     Thibaut Carpentier
 *   @date       01/2016
 *
 */
/************************************************************************************/


var SmartFader = function (_AbstractNode) {
    _inherits(SmartFader, _AbstractNode);

    //==============================================================================
    /**
     * @param {AudioContext} audioContext - audioContext instance.
     * @param {AudioStreamDescriptionCollection} audioStreamDescriptionCollection - audioStreamDescriptionCollection
     * @param {number} dB - dB value for the SmartFader.
     */

    function SmartFader(audioContext) {
        var audioStreamDescriptionCollection = arguments.length <= 1 || arguments[1] === undefined ? undefined : arguments[1];
        var dB = arguments.length <= 2 || arguments[2] === undefined ? 0.0 : arguments[2];

        _classCallCheck(this, SmartFader);

        var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(SmartFader).call(this, audioContext, audioStreamDescriptionCollection));

        _this._dB = undefined;
        _this._compressionRatio = SmartFader.defaultCompressionRatio;
        _this._attackTime = SmartFader.defaultAttackTime;
        _this._releaseTime = SmartFader.defaultReleaseTime;

        /// the total number of incoming channels, including all the streams
        /// (mainAudio, extendedAmbience, extendedComments and extendedDialogs)
        var totalNumberOfChannels_ = _this._audioStreamDescriptionCollection.totalNumberOfChannels;

        ///@n the gain and dynamic compression are applied similarly to all channels
        _this._gainNode = audioContext.createGain();
        _this._dynamicCompressorNode = new _compressor2.default(audioContext, totalNumberOfChannels_);

        /// connect the audio nodes
        {
            _this._input.connect(_this._gainNode);
            _this._gainNode.connect(_this._dynamicCompressorNode._input);
            _this._dynamicCompressorNode.connect(_this._output);
        }

        /// initialization
        {
            _this.dB = dB;
            _this._updateCompressorSettings();
        }
        return _this;
    }

    //==============================================================================
    /**
     * Set the dB value
     * @type {number}
     */


    _createClass(SmartFader, [{
        key: 'setdBFromGui',


        //==============================================================================
        /**
         * Sets the compression ratio, according to a slider in the GUI
         * theSlider : the slider
         * return the actual value of the compression ratio
         */
        value: function setdBFromGui(theSlider) {

            /// the value of the fader
            var valueFader = parseFloat(theSlider.value);

            // get the bounds of the fader (GUI)
            var minFader = parseFloat(theSlider.min);
            var maxFader = parseFloat(theSlider.max);

            // get the actual bounds for this parameter

            var _SmartFader$dBRange = _slicedToArray(SmartFader.dBRange, 2);

            var minValue = _SmartFader$dBRange[0];
            var maxValue = _SmartFader$dBRange[1];

            /// scale from GUI to DSP

            var value = M4DPAudioModules.utilities.scale(valueFader, minFader, maxFader, minValue, maxValue);

            this.dB = value;

            return value;
        }

        /**
         * Returns the current value of compression ratio, already scaled for the GUI
         * theSlider : the slider
         */

    }, {
        key: 'getdBForGui',
        value: function getdBForGui(theSlider) {

            // get the bounds of the fader (GUI)
            var minFader = parseFloat(theSlider.min);
            var maxFader = parseFloat(theSlider.max);

            // get the actual bounds for this parameter

            var _SmartFader$dBRange2 = _slicedToArray(SmartFader.dBRange, 2);

            var minValue = _SmartFader$dBRange2[0];
            var maxValue = _SmartFader$dBRange2[1];


            var actualValue = this.dB;

            /// scale from DSP to GUI
            var value = M4DPAudioModules.utilities.scale(actualValue, minValue, maxValue, minFader, maxFader);

            return value;
        }

        //==============================================================================
        /**
         * Returns the dynamic compression state
         * @type {boolean}
         */

    }, {
        key: 'activeStreamsChanged',


        /**
         * Notification when the active stream(s) changes
         */
        value: function activeStreamsChanged() {
            this._updateCompressorSettings();
        }

        //==============================================================================
        /**
         * Sets the compression ratio
         * representing the amount of change, in dB, needed in the input for a 1 dB change in the output
         */

    }, {
        key: 'setCompressionRatioFromGui',


        //==============================================================================
        /**
         * Sets the compression ratio, according to a slider in the GUI
         * theSlider : the slider
         * return the actual value of the compression ratio
         */
        value: function setCompressionRatioFromGui(theSlider) {

            /// the value of the fader
            var valueFader = parseFloat(theSlider.value);

            // get the bounds of the fader (GUI)
            var minFader = parseFloat(theSlider.min);
            var maxFader = parseFloat(theSlider.max);

            // get the actual bounds for this parameter

            var _SmartFader$compressi = _slicedToArray(SmartFader.compressionRatioRange, 2);

            var minValue = _SmartFader$compressi[0];
            var maxValue = _SmartFader$compressi[1];

            /// scale from GUI to DSP

            var value = M4DPAudioModules.utilities.scale(valueFader, minFader, maxFader, minValue, maxValue);

            this.compressionRatio = value;

            return value;
        }

        /**
         * Returns the current value of compression ratio, already scaled for the GUI
         * theSlider : the slider
         */

    }, {
        key: 'getCompressionRatioForGui',
        value: function getCompressionRatioForGui(theSlider) {

            // get the bounds of the fader (GUI)
            var minFader = parseFloat(theSlider.min);
            var maxFader = parseFloat(theSlider.max);

            // get the actual bounds for this parameter

            var _SmartFader$compressi2 = _slicedToArray(SmartFader.compressionRatioRange, 2);

            var minValue = _SmartFader$compressi2[0];
            var maxValue = _SmartFader$compressi2[1];


            var actualValue = this.compressionRatio;

            /// scale from DSP to GUI
            var value = M4DPAudioModules.utilities.scale(actualValue, minValue, maxValue, minFader, maxFader);

            return value;
        }

        //==============================================================================
        /**
         * Sets the attack time (in msec)
         * representing the amount of time, in seconds, required to reduce the gain by 10 dB
         */

    }, {
        key: 'setAttackTimeFromGui',


        //==============================================================================
        /**
         * Sets the attack time, according to a slider in the GUI
         * theSlider : the slider
         * return the actual value of the attack time (in msec)
         */
        value: function setAttackTimeFromGui(theSlider) {

            /// the value of the fader
            var valueFader = parseFloat(theSlider.value);

            // get the bounds of the fader (GUI)
            var minFader = parseFloat(theSlider.min);
            var maxFader = parseFloat(theSlider.max);

            // get the actual bounds for this parameter

            var _SmartFader$attackTim = _slicedToArray(SmartFader.attackTimeRange, 2);

            var minValue = _SmartFader$attackTim[0];
            var maxValue = _SmartFader$attackTim[1];

            /// scale from GUI to DSP

            var value = M4DPAudioModules.utilities.scale(valueFader, minFader, maxFader, minValue, maxValue);

            this.attackTime = value;

            return value;
        }

        /**
         * Returns the current value of attack time, already scaled for the GUI
         * theSlider : the slider
         */

    }, {
        key: 'getAttackTimeForGui',
        value: function getAttackTimeForGui(theSlider) {

            // get the bounds of the fader (GUI)
            var minFader = parseFloat(theSlider.min);
            var maxFader = parseFloat(theSlider.max);

            // get the actual bounds for this parameter

            var _SmartFader$attackTim2 = _slicedToArray(SmartFader.attackTimeRange, 2);

            var minValue = _SmartFader$attackTim2[0];
            var maxValue = _SmartFader$attackTim2[1];


            var actualValue = this.attackTime;

            /// scale from DSP to GUI
            var value = M4DPAudioModules.utilities.scale(actualValue, minValue, maxValue, minFader, maxFader);

            return value;
        }

        //==============================================================================
        /**
         * Sets the release time (in msec)
         * representing the amount of time, in seconds, required to increase the gain by 10 dB
         */

    }, {
        key: 'setReleaseTimeFromGui',


        //==============================================================================
        /**
         * Sets the release time, according to a slider in the GUI
         * theSlider : the slider
         * return the actual value of the release time (in msec)
         */
        value: function setReleaseTimeFromGui(theSlider) {

            /// the value of the fader
            var valueFader = parseFloat(theSlider.value);

            // get the bounds of the fader (GUI)
            var minFader = parseFloat(theSlider.min);
            var maxFader = parseFloat(theSlider.max);

            // get the actual bounds for this parameter

            var _SmartFader$releaseTi = _slicedToArray(SmartFader.releaseTimeRange, 2);

            var minValue = _SmartFader$releaseTi[0];
            var maxValue = _SmartFader$releaseTi[1];

            /// scale from GUI to DSP

            var value = M4DPAudioModules.utilities.scale(valueFader, minFader, maxFader, minValue, maxValue);

            this.releaseTime = value;

            return value;
        }

        /**
         * Returns the current value of release time, already scaled for the GUI
         * theSlider : the slider
         */

    }, {
        key: 'getReleaseTimeForGui',
        value: function getReleaseTimeForGui(theSlider) {

            // get the bounds of the fader (GUI)
            var minFader = parseFloat(theSlider.min);
            var maxFader = parseFloat(theSlider.max);

            // get the actual bounds for this parameter

            var _SmartFader$releaseTi2 = _slicedToArray(SmartFader.releaseTimeRange, 2);

            var minValue = _SmartFader$releaseTi2[0];
            var maxValue = _SmartFader$releaseTi2[1];


            var actualValue = this.releaseTime;

            /// scale from DSP to GUI
            var value = M4DPAudioModules.utilities.scale(actualValue, minValue, maxValue, minFader, maxFader);

            return value;
        }
    }, {
        key: '_updateCompressorSettings',
        value: function _updateCompressorSettings() {

            /// retrieves the AudioStreamDescriptionCollection
            var asdc = this._audioStreamDescriptionCollection;

            if (asdc.hasActiveStream === false) {
                //console.log( "no active streams !!");
                return;
            }

            ///@todo : que faire si plusieurs streams sont actifs ??

            /// retrieves the active AudioStreamDescription(s)
            var asd = asdc.actives;

            /// sanity check
            if (asd.length <= 0) {
                throw new Error("Y'a un bug qq part...");
            }

            /// use the first active stream (???)
            var activeStream = asd[0];

            /**
            Le reglage du volume doit se comporter de la facon suivante :
            - attenuation classique du volume sonore entre le niveau nominal (gain = 0) et en deca
            - augmentation classique du volume sonore entre le niveau nominal et le niveau max (niveau max = niveau nominal + I MaxTruePeak I)
            - limiteur/compresseur multicanal au dela du niveau max
            */

            /// retrieves the MaxTruePeak (ITU­R BS.1770­3) of the active AudioStreamDescription
            /// (expressed in dBTP)
            var maxTruePeak = activeStream.maxTruePeak;

            /// integrated loudness (in LUFS)
            var nominal = activeStream.loudness;

            /// sanity check
            if (nominal >= 0.0) {
                throw new Error("Ca parait pas bon...");
            }

            var threshold = nominal + Math.abs(maxTruePeak);

            /**
            Matthieu :
            Dans mon papier sur le sujet j'avais défini les ordres de grandeur d'une matrice pour expliciter
            la progression de la compression en fonction du niveau d'entrée. 
            Ça donne un ratio de 2:1 sur les premiers 6 dB de dépassement puis 3:1 au delà. 
            Est-ce plus simple pour vous d'user de cette matrice ou d'appeler un compresseur multicanal 
            et lui passer des paramètres classiques ?
             On aurait alors :
            Threshold à -18 dBFS
            Ratio à 2:1
            Attack à 20 ms
            Release à 200 ms
            */

            /// representing the decibel value above which the compression will start taking effect
            this._dynamicCompressorNode.setThreshold(threshold);

            /// representing the amount of change, in dB, needed in the input for a 1 dB change in the output
            this._dynamicCompressorNode.setRatio(this._compressionRatio);

            /// representing the amount of time, in seconds, required to reduce the gain by 10 dB
            var attackInSeconds = _utils2.default.ms2sec(this._attackTime);
            this._dynamicCompressorNode.setAttack(attackInSeconds);

            /// representing the amount of time, in seconds, required to increase the gain by 10 dB
            var releaseInSeconds = _utils2.default.ms2sec(this._releaseTime);
            this._dynamicCompressorNode.setRelease(releaseInSeconds);
        }
    }, {
        key: '_update',
        value: function _update() {

            //console.log( "_update" );

            /// the current fader value, in dB
            var fader = this._dB;

            if (typeof fader === "undefined" || isNaN(fader) === true) {
                /// this can happen during the construction...
                return;
            }

            var lin = _utils2.default.dB2lin(fader);

            this._gainNode.gain.value = lin;
        }
    }, {
        key: 'dB',
        set: function set(value) {

            /// clamp the incoming value
            this._dB = SmartFader.clampdB(value);

            /// update the DSP processor
            this._update();
        }

        /**
         * Get the dB value
         * @type {number}
         */
        ,
        get: function get() {
            return this._dB;
        }

        /**
         * Clips a value within the proper dB range
         * @type {number} value the value to be clipped
         */

    }, {
        key: 'dynamicCompressionState',
        get: function get() {

            /// representing the amount of gain reduction currently applied by the compressor to the signal.

            /**
            Intended for metering purposes, it returns a value in dB, or 0 (no gain reduction) if no signal is fed
            into the DynamicsCompressorNode. The range of this value is between -20 and 0 (in dB).
            */

            var reduction = this._dynamicCompressorNode.getReduction();

            var state = reduction < -0.5 ? true : false;

            return state;
        }
    }, {
        key: 'compressionRatio',
        set: function set(value) {
            var _SmartFader$compressi3 = _slicedToArray(SmartFader.compressionRatioRange, 2);

            var minValue = _SmartFader$compressi3[0];
            var maxValue = _SmartFader$compressi3[1];


            this._compressionRatio = _utils2.default.clamp(value, minValue, maxValue);

            this._updateCompressorSettings();
        }

        /**
         * Returns the compression ratio     
         */
        ,
        get: function get() {
            return this._compressionRatio;
        }

        /**
         * Get the compression ratio range
         * @type {array}     
         */

    }, {
        key: 'attackTime',
        set: function set(value) {
            var _SmartFader$attackTim3 = _slicedToArray(SmartFader.attackTimeRange, 2);

            var minValue = _SmartFader$attackTim3[0];
            var maxValue = _SmartFader$attackTim3[1];


            this._attackTime = _utils2.default.clamp(value, minValue, maxValue);

            this._updateCompressorSettings();
        }

        /**
         * Returns the attack time (in msec)  
         */
        ,
        get: function get() {
            return this._attackTime;
        }

        /**
         * Get the attack time range (in msec)
         * @type {array}     
         */

    }, {
        key: 'releaseTime',
        set: function set(value) {
            var _SmartFader$releaseTi3 = _slicedToArray(SmartFader.releaseTimeRange, 2);

            var minValue = _SmartFader$releaseTi3[0];
            var maxValue = _SmartFader$releaseTi3[1];


            this._releaseTime = _utils2.default.clamp(value, minValue, maxValue);

            this._updateCompressorSettings();
        }

        /**
         * Returns the release time (in msec)  
         */
        ,
        get: function get() {
            return this._releaseTime;
        }

        /**
         * Get the release time range (in msec)
         * @type {array}     
         */

    }], [{
        key: 'clampdB',
        value: function clampdB(value) {
            var _SmartFader$dBRange3 = _slicedToArray(SmartFader.dBRange, 2);

            var minValue = _SmartFader$dBRange3[0];
            var maxValue = _SmartFader$dBRange3[1];


            return _utils2.default.clamp(value, minValue, maxValue);
        }

        //==============================================================================
        /**
         * Get the dB range
         * @type {array}
         * @details +8 dB suffisent, pour passer du -23 au -15 LUFS (iTunes), c'est l'idée.
         */

    }, {
        key: 'dBRange',
        get: function get() {
            return [-60, 8];
        }
    }, {
        key: 'mindBRange',
        get: function get() {
            var _SmartFader$dBRange4 = _slicedToArray(SmartFader.dBRange, 2);

            var minValue = _SmartFader$dBRange4[0];
            var maxValue = _SmartFader$dBRange4[1];

            return minValue;
        }
    }, {
        key: 'maxdBRange',
        get: function get() {
            var _SmartFader$dBRange5 = _slicedToArray(SmartFader.dBRange, 2);

            var minValue = _SmartFader$dBRange5[0];
            var maxValue = _SmartFader$dBRange5[1];

            return maxValue;
        }

        /**
         * Returns the default value (in dB)
         * @type {number}
         */

    }, {
        key: 'dBDefault',
        get: function get() {
            return 0;
        }
    }, {
        key: 'compressionRatioRange',
        get: function get() {
            return [1, 10];
        }
    }, {
        key: 'minCompressionRatioRange',
        get: function get() {
            var _SmartFader$compressi4 = _slicedToArray(SmartFader.compressionRatioRange, 2);

            var minValue = _SmartFader$compressi4[0];
            var maxValue = _SmartFader$compressi4[1];

            return minValue;
        }
    }, {
        key: 'maxCompressionRatioRange',
        get: function get() {
            var _SmartFader$compressi5 = _slicedToArray(SmartFader.compressionRatioRange, 2);

            var minValue = _SmartFader$compressi5[0];
            var maxValue = _SmartFader$compressi5[1];

            return maxValue;
        }

        /**
         * Returns the default compression ratio
         * @type {number}
         */

    }, {
        key: 'defaultCompressionRatio',
        get: function get() {
            return 2;
        }
    }, {
        key: 'attackTimeRange',
        get: function get() {
            return [5, 500];
        }

        /**
         * Returns the minimum attack time (in msec)  
         */

    }, {
        key: 'minAttackTimeRange',
        get: function get() {
            var _SmartFader$attackTim4 = _slicedToArray(SmartFader.attackTimeRange, 2);

            var minValue = _SmartFader$attackTim4[0];
            var maxValue = _SmartFader$attackTim4[1];

            return minValue;
        }

        /**
         * Returns the maximum attack time (in msec)  
         */

    }, {
        key: 'maxAttackTimeRange',
        get: function get() {
            var _SmartFader$attackTim5 = _slicedToArray(SmartFader.attackTimeRange, 2);

            var minValue = _SmartFader$attackTim5[0];
            var maxValue = _SmartFader$attackTim5[1];

            return maxValue;
        }

        /**
         * Returns the default attack time (in msec)
         * @type {number}
         */

    }, {
        key: 'defaultAttackTime',
        get: function get() {
            return 20;
        }
    }, {
        key: 'releaseTimeRange',
        get: function get() {
            return [5, 1000];
        }

        /**
         * Returns the minimum release time (in msec)  
         */

    }, {
        key: 'minReleaseTimeRange',
        get: function get() {
            var _SmartFader$releaseTi4 = _slicedToArray(SmartFader.releaseTimeRange, 2);

            var minValue = _SmartFader$releaseTi4[0];
            var maxValue = _SmartFader$releaseTi4[1];

            return minValue;
        }

        /**
         * Returns the maximum release time (in msec)  
         */

    }, {
        key: 'maxReleaseTimeRange',
        get: function get() {
            var _SmartFader$releaseTi5 = _slicedToArray(SmartFader.releaseTimeRange, 2);

            var minValue = _SmartFader$releaseTi5[0];
            var maxValue = _SmartFader$releaseTi5[1];

            return maxValue;
        }

        /**
         * Returns the default release time (in msec)
         * @type {number}
         */

    }, {
        key: 'defaultReleaseTime',
        get: function get() {
            return 200;
        }
    }]);

    return SmartFader;
}(_index2.default);

exports.default = SmartFader;
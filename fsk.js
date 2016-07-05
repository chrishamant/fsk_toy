var outputContext = null

if (typeof AudioContext !== "undefined") {
    outputContext  = new AudioContext()
} else if (typeof webkitAudioContext !== "undefined") {
    outputContext  = new webkitAudioContext()
} else {
    console.log("AudioContext not supported")
}

var MARK = 2125 //
var OFFSET = 425
var SPACE = MARK + OFFSET
var BAUD_RATE = 45.45 //characters per second
var INVERT = false
var SAMPLE_RATE = 44100

function sequenceForChar(_char){

    var bits = baudot[_char.toLowerCase()]

    //sanity check
    if(/^(1|0){5}$/.test(bits)){
        return bits.split('').map(function(i){
          return i == '1' ? MARK : SPACE
        })
    }else{
        return null
    }
}

var baudot = {
  "":  "00000",
  " ": "00100",
  "q": "10111",
  "w": "10011",
  "e": "00001",
  "r": "01010",
  "t": "10000",
  "y": "10101",
  "u": "00111",
  "i": "00110",
  "o": "11000",
  "p": "10110",
  "a": "00011",
  "s": "00101",
  "d": "01001",
  "f": "01101",
  "g": "11010",
  "h": "10100",
  "j": "01011",
  "k": "01111",
  "l": "10010",
  "z": "10001",
  "x": "11101",
  "c": "01110",
  "v": "11110",
  "b": "11001",
  "n": "01100",
  "m": "11100",
  "\n": "01000",
  "\r": "00010",
  "1": "10111",
  "2": "10011",
  "3": "00001",
  "4": "01010",
  "5": "10000",
  "6": "10101",
  "7": "00111",
  "8": "00110",
  "9": "11000",
  "0": "10110",
  "-": "00011",
  "!": "01101",
  "&": "11010",
  "#": "10100",
  "'": "01011",
  "(": "01111",
  ")": "10010",
  '"': "10001",
  "/": "11101",
  ":": "01110",
  ";": "11110",
  "?": "11001",
  ",": "01100",
  ".": "11100",
  "_figure_shift": "11011",
  "_letter_shift": "11111"
}
function createOscillator(freq,start,stop,ctx){

    var osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq
    osc.start(start)
    osc.stop(stop)
    osc.connect(ctx.destination)

    return osc
}

function fadeOut(stop,ctx){
    var DECAY = 0.0001

    var gain = ctx.createGain()
    gain.gain.value = 1.0
    gain.gain.setTargetAtTime(0, stop-0.002, DECAY)
    gain.connect(ctx.destination)

    return gain
}

function kickOFF(){
    //baud expected in (chars/sec) -> #time for one char (in ms) (upper limit)
    //var baseTime = Math.ceil(1000/BAUD_RATE)
    var baseTime = 1000/BAUD_RATE

    var str = "aaaaaaaaaaaaaaaaa"

    var seqs = str.split('').map(sequenceForChar).reduce(function(arr,item){
      if(item){arr.push(item)}; return arr
    },[])

    //length in seconds (from ms)
    //7.5 bits per char
    var length = (seqs.length * 6 * baseTime + (baseTime * 1.5 * seqs.length))/1000 //ms->seconds
    var carrier_length = 5 //seconds

    var offline_audio = new OfflineAudioContext(1, (SAMPLE_RATE * length) + (carrier_length * SAMPLE_RATE) ,SAMPLE_RATE)


    var current_position = carrier_length

    var osc = offline_audio.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = MARK
    osc.start(0)
    osc.connect(offline_audio.destination)

    var count = 0
    baseTimeSec = baseTime / 1000

    //TODO prepend with NULLS

    seqs.forEach(function(char){
        //start bit
        osc.frequency.setTargetAtTime(MARK,current_position + baseTimeSec, 0.000001)

        char.forEach(function(freq){
            osc.frequency.setTargetAtTime(freq,current_position + baseTimeSec, 0.000001)
            current_position += baseTimeSec
        })

        osc.frequency.setTargetAtTime(SPACE,current_position + (baseTimeSec * 1.5), 0.000001)
        current_position += (baseTimeSec*1.5)
    })

    osc.frequency.setTargetAtTime(MARK,current_position, 0.000001)

    //TODO fill with NULLS



    offline_audio.startRendering().then(function(renderedBuffer) {
        var song = outputContext.createBufferSource()
        song.buffer = renderedBuffer
        song.connect(outputContext.destination)
        song.start()
    })
}

window.addEventListener('touchstart', function() {
  alert("tap")
  kickOFF()

}, false);

document.getElementById("the_button").addEventListener("click", function(){

  alert("tap")
  kickOFF()
});

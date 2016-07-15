var baudot = {
  "" : "00000",
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

var outputContext = null

var MARK = 2125 //
var OFFSET = 425
var SPACE = MARK + OFFSET
var BAUD_RATE = 45.45 //characters per second
var INVERT = false
var SAMPLE_RATE = 44100

var SAMPLES_PER_BIT = Math.ceil(SAMPLE_RATE/ BAUD_RATE)

var dataURI = ""

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

//iOS 9 is silly and must initialize the audio system to play properly
// this just generates a "nothing" output to ensure system is started before trying to output real tones
function initAudio(){
    var initbuffer = outputContext.createBuffer(1, 1, 22050);
    var source = outputContext.createBufferSource();
    source.buffer = initbuffer;
    source.connect(outputContext.destination);
    source.start(0);
}

function chr8() {
    return Array.prototype.map.call(arguments, function(a){
        //truncate to 8 bits
        return String.fromCharCode( a & 0xff)
    }).join('');
}
function chr32() {
    return Array.prototype.map.call(arguments, function(a){
        return String.fromCharCode(a&0xff, (a>>8)&0xff,(a>>16)&0xff, (a>>24)&0xff);
    }).join('');
}

function generate(){

    if (typeof AudioContext !== "undefined") {
        outputContext  = new AudioContext()
    } else if (typeof webkitAudioContext !== "undefined") {
        outputContext  = new webkitAudioContext()
    } else {
        console.log("AudioContext not supported")
        return
    }

    initAudio()

    var str = document.getElementById("speakme").value || "aaaaaaaa"

    var seqs = str.split('').map(sequenceForChar).reduce(function(arr,item){
      if(item){arr.push(item)}; return arr
    },[])

    //TODO PREPEND SOME NULLS AND follow with some nulls/spaces closed by bell

    //in "sample frames"
    var length = seqs.length * 7.5 * SAMPLES_PER_BIT

    var outputBuffer = outputContext.createBuffer(1, length, SAMPLE_RATE);
    var channel = outputBuffer.getChannelData(0)
    var bufferTime = 0

    var wave_data = "RIFF" + chr32(length+36) + "WAVE" +
        "fmt " + chr32(16, 0x00010001, SAMPLE_RATE, SAMPLE_RATE, 0x00080001) +
        "data" + chr32(length);

    var lastSample = 0

    function writeBit(freq){
        for( var i = 0; i< SAMPLES_PER_BIT; i++){
            //set 32bit float
            var sample = 128 + 127 * Math.sin((2 * Math.PI) * (i / SAMPLE_RATE) * freq);

            var raw_s = sample

            //var POPPING_THRESHOLD = 45
            //if (Math.abs(sample - lastSample) > POPPING_THRESHOLD){
            //    sample = sample / 2 //reduce value by 1/3 to more gradually approach next sample
            //}

            wave_data += chr8(sample)
            channel[bufferTime] = sample
            lastSample = sample
            bufferTime++
        }
    }

    seqs.forEach(function(char){
        //start bit
        writeBit(MARK)

        char.forEach(function(freq){
            writeBit(freq)
        })

        //stop bit (1.5 normal length)
        for( var i = 0; i< Math.floor(SAMPLES_PER_BIT * 1.5); i++){
            //set 32bit float
            var sample = 128 + 127 * Math.sin((2 * Math.PI) * (i / SAMPLE_RATE) * SPACE);
            channel[bufferTime] = sample
            wave_data += chr8(sample)
            bufferTime++
        }
    })


    var song = outputContext.createBufferSource()
    song.buffer = outputBuffer
    song.connect(outputContext.destination)
    song.start()

    dataURI = "data:audio/wav;base64," + escape(btoa(wave_data))

    //window.open(dataURI)
}

document.getElementById("the_button").addEventListener("click", function(event){
  event.preventDefault()
  generate()
  return false
});

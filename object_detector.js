const video = document.getElementById("videoin");
const audioSelect = document.getElementById('audioSource');
const videoSelect = document.getElementById('videoSource');
const canvas = document.getElementById("canvasplace");
const context = canvas.getContext("2d");


const display_age = document.getElementById("age")
const display_gender = document.getElementById("gender")
const display_agelow = document.getElementById("agelow")
const display_loop = document.getElementById("loop")


video.addEventListener("loadeddata", () => {
    console.log(video.videoWidth, video.videoHeight);
});



// Updates the select element with the provided set of cameras
function updateCameraList(cameras) {
    const listElement = document.querySelector('select#availableCameras');
    listElement.innerHTML = '';
    cameras.map(camera => {
        const cameraOption = document.createElement('option');
        cameraOption.label = camera.label;
        cameraOption.value = camera.deviceId;
    }).forEach(cameraOption => listElement.add(cameraOption));
}

// Fetch an array of devices of a certain type
async function getConnectedDevices(type) {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === type)
}

function gotDevices(deviceInfos) {
    window.deviceInfos = deviceInfos; // make available to console
    for (const deviceInfo of deviceInfos) {
        const option = document.createElement('option');
        option.value = deviceInfo.deviceId;
        if (deviceInfo.kind === 'audioinput') {
            option.text = deviceInfo.label || `Microphone ${audioSelect.length + 1}`;
            audioSelect.appendChild(option);
        } else if (deviceInfo.kind === 'videoinput') {
            option.text = deviceInfo.label || `Camera ${videoSelect.length + 1}`;
            videoSelect.appendChild(option);
        }
    }
}


function getDevices() {
    // AFAICT in Safari this only gets default devices until gUM is called :/
    return navigator.mediaDevices.enumerateDevices();
}

function getStream() {
    if (window.stream) {
        window.stream.getTracks().forEach(track => {
            track.stop();
        });
    }
    const audioSource = audioSelect.value;
    const videoSource = videoSelect.value;
    const constraints = {
        audio: {deviceId: audioSource ? {exact: audioSource} : undefined},
        video: {deviceId: videoSource ? {exact: videoSource} : undefined}
    };
    return navigator.mediaDevices.getUserMedia(constraints).
        then(gotStream).catch(handleError);
}

function gotStream(stream) {
    window.stream = stream; // make stream available to console
    audioSelect.selectedIndex = [...audioSelect.options].
        findIndex(option => option.text === stream.getAudioTracks()[0].label);
    videoSelect.selectedIndex = [...videoSelect.options].
        findIndex(option => option.text === stream.getVideoTracks()[0].label);
    videoin.srcObject = stream;
}



function handleError(error) {
  console.error('Error: ', error);
}

canvas.width = 640;
canvas.height = 480;

let promises = null;

audioSelect.onchange = getStream;
videoSelect.onchange = getStream;

getStream().then(getDevices).then(gotDevices);

let ages=[]
let ageslow=[]
let detectionloop = ['|','/','-','\\'];
let loopindex = 0 ; 
let changecolor = false ;




const animationLoop= ()=> {
    if (promises) {
        _livenessCheck = true ; 
        const process_frame = async () => {
            const detection = _livenessCheck 
            ? await faceapi.detectSingleFace(
                        video, new faceapi.TinyFaceDetectorOptions()
                    ).withFaceLandmarks().withAgeAndGender().withFaceDescriptor()
            : await faceapi.detectSingleFace(
                        video, new faceapi.TinyFaceDetectorOptions()  
                        ).withFaceLandmarks().withAgeAndGender()
            if (detection) {
                    const age = Math.round(detection.age);
                    const gender = detection.gender ;
                    let leftEye = detection.landmarks.getLeftEye()[0];
                    let rightEye = detection.landmarks.getRightEye()[0];
                    let eyeDistance = Math.abs(rightEye.x - leftEye.x);
                    let nose = detection.landmarks.getNose()[4];
                    //let lookingStraight = Math.abs(nose - (leftEye + rightEye) / 2) < eyeDistance * 0.125;
                    if (detection.detection.score > 0.9) {
  
                        ages.unshift (age);
                        ages = ages.slice(0,50);
                        average = 0;
                        for (i = 0 ; i < ages.length ; i++ ) {
                            average +=ages[i];  
                        }
                        average /= ages.length;
                        display_age.innerHTML = Math.floor(average).toString();
                        if(changecolor) {
                            display_age.style.background = 'green';
                            display_age.style.color = 'white';
                        } else {
                            display_age.style.background = 'white';
                            display_age.style.color = 'green';
                        }
                        changecolor = !changecolor ;
                        
                    }    
                    if (detection.detection.score > 0.75) {
                        ageslow.unshift (age)
                        ageslow = ageslow.slice(0,50)

                        average = 0
                        for (i = 0 ; i < ageslow.length ; i++ ) {
                            average +=ageslow[i];  
                        }
                        average /= ageslow.length;
                        display_agelow.innerHTML = Math.floor(average).toString();
                        display_agelow.style.color  = "orange";

                        loopindex ++ ;
                        if (loopindex >= detectionloop.length) { loopindex = 0; }
                        display_loop.innerHTML = detectionloop[loopindex] ;

                        display_gender.innerHTML = gender

                        context.drawImage(video,0,0,640,480); 

                        // const dims = detection.detection.box ;
                        // context.beginPath();
                        // context.lineWidth = "4";
                        // context.strokeStyle = "blue";
                        // context.rect(dims.x, dims.y, dims.width, dims.height); 
                        // context.stroke();

                        // const drawOptions = {
                        //     label: Math.round(detection.age).toString() + " " 
                        // }
                        // const drawBox = new faceapi.draw.DrawBox(dims, drawOptions);
                        // drawBox.draw(canvas);
            


                        //display_score.innerHTML = detection.detection.score.toString();
                        
                    }  
 

            }
        }
        
        process_frame()
    }

    requestAnimationFrame(animationLoop)

};



async function loadModels() {
    console.log ("loadModels")
    try {
        promises = Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri('./models'),
            faceapi.nets.ageGenderNet.loadFromUri('./models'),
            faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
            faceapi.nets.faceRecognitionNet.loadFromUri('./models')
            
        ]) 
        .then (() =>  {
            console.log ("loaded model")
        })
        .catch(() => {
            console.error('Error loading models');
            promises = null;
        });
    } catch (error) {
        console.error('Error loading models');
        promises = null;
    }
}


async function run_model(input) {

}


loadModels()
animationLoop()

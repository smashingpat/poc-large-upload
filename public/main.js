const fileElement = document.getElementById('file');
const uploadElement = document.getElementById('upload');
const statusElement = document.getElementById('status');

const sliceSize = 500 * 1028;

function updateStatus(text) {
    statusElement.innerHTML = text;
}

async function startUpload(fileExtension) {
    const response = await fetch('/api/upload/start', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({ fileExtension })
    });
    return response.json();
}

async function endUpload(uploadId) {
    const response = await fetch(`/api/upload/end/${uploadId}`, {
        method: 'POST',
    });
    return response.json();
}

uploadElement.addEventListener('click', async () => {
    const file = fileElement.files[0];
    if (file) {
        const fileExtension = file.name.split('.').pop();
        const uploadInfo = await startUpload(fileExtension);
        const reader = new FileReader();
        
        function uploadChunk(sliceIndex = 0, chunkNumber = 1) {
            return new Promise((resolve, reject) => {
                const nextSlice = sliceIndex + sliceSize + 1;
                const blob = file.slice(sliceIndex, nextSlice);

                updateStatus(`upload file: ${Math.min(Math.round(nextSlice / file.size * 100), 100)}%`)
                
                reader.onloadend = async function (event) {
                    if (event.target.readyState !== FileReader.DONE) {
                        return reject(new Error('was still busy'));
                    }

                    const response = await fetch(`/api/upload/push/${uploadInfo.id}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/octet-stream',
                        },
                        body: event.target.result.replace(/^data:application\/octet-stream;base64,/, ''),
                    });
                    const data = await response.json();
                    if (nextSlice < file.size) {
                        resolve(uploadChunk(nextSlice, chunkNumber + 1));
                    } else {
                        resolve('done');
                    }
                }
                reader.readAsDataURL(blob);
            })
        }
    
        uploadChunk().then(() => {
            updateStatus('done uploading');
            endUpload(uploadInfo.id);
        });
    }
});

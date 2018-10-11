const fileElement = document.getElementById('file');
const uploadElement = document.getElementById('upload');

const sliceSize = 1000 * 1028;

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
                
                reader.onloadend = async function (event) {
                    if (event.target.readyState !== FileReader.DONE) {
                        return reject(new Error('was still busy'));
                    }

                    const response = await fetch(`/api/upload/push/${uploadInfo.id}/${chunkNumber}`, {
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
    
        uploadChunk();
    }
});

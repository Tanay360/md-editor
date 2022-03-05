import { generatePdf } from 'html-pdf-node';

function streamToString (stream) {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  })
}


export async function post( { request } ) {
    try {
        const body = await streamToString(request.body)
        const pdfBuffer = await generatePdf({
            content: body
        }, {
            format: 'A4'
        })
        return {
            status: 200,
            body: pdfBuffer
        }
    } catch (e) {
        return {
            status: 500
        }
    }
    
}
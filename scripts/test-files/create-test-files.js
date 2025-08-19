const fs = require('fs');
const path = require('path');

// Create a simple test image (1x1 red pixel JPEG)
const testImageBase64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=';

const testImageBuffer = Buffer.from(testImageBase64, 'base64');
fs.writeFileSync(path.join(__dirname, 'test-image.jpg'), testImageBuffer);
console.log('Created test-image.jpg');

// Create a simple test PDF
// This is a minimal valid PDF that says "Test Document"
const testPdfHex = '255044462d312e340a25c3a4c3bcc3b6c39f0a322030206f626a0a3c3c2f4c656e677468203337352f46696c746572202f466c6174654465636f64653e3e0a73747265616d0a789c5d914b6ec3300c44f79c82de209740402020c240087081900e48e740709050ea9fdb4dd2b4bbba4ed5e89aa669180c269cf5c3d4e256f8f9e1f074727272b4c363636cf18ae5e5b8b172ced9e88a44c7a73c7d9e87c3e5b9898985c6363637373ced6e8746a363933cee9743a3b9d4e0fc783414f4f8f4aa5524020c86432c964b2462211c96432994c568bc542b1502814c2e170b8542a158944a2512814c2e17038140ac562b158acebeb6b6868686c6c6c6e6e6eeded1d1414d4d5d575d4d4343737f7ececececfcfafa7a7878d8dddddbdbdb3b3b3bbbbbfbfafa3a393979e4e4e4ececec1c1d1d7d7c7cfcf9f9f9e5e5e5e3e3e3ebebeb1b1a1a7a7b7bfbf8f8f4f4f4f2f2f2fafaf6f6f6fefef1f1f1f9f9f5f5f5fdfdf3f3f3fbfbf7f70f1cf6234d0a656e6473747265616d0a656e646f626a0a0a332030206f626a0a3c3c2f547970652f506167652f506172656e742031203020522f5265736f75726365733c3c2f466f6e743c3c2f46312034203020523e3e3e3e2f4d65646961426f785b302030203631322037395d2f436f6e74656e74732032203020523e3e0a656e646f626a0a0a342030206f626a0a3c3c2f547970652f466f6e742f537562747970652f54797065312f42617365466f6e742f48656c7665746963613e3e0a656e646f626a0a0a312030206f626a0a3c3c2f547970652f506167657320203c3c2f4b6964735b332030205d2f436f756e7420313e3e3e0a656e646f626a0a0a352030206f626a0a3c3c2f547970652f436174616c6f672f50616765732031203020523e3e0a656e646f626a0a0a362030206f626a0a3c3c2f50726f64756365722028546573742050444620437265';

// Convert hex to buffer
const testPdfBuffer = Buffer.from(testPdfHex, 'hex');

// Add the rest of the PDF content
const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(Test Document) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000260 00000 n 
0000000341 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
432
%%EOF`;

fs.writeFileSync(path.join(__dirname, 'test-document.pdf'), pdfContent);
console.log('Created test-document.pdf');

// Create a simple text document
const testTextContent = `Test Document Content

This is a test document with multiple lines.
It contains simple text that can be used for testing.

Section 1: Introduction
This document is used for testing document upload capabilities.

Section 2: Content
The content here is minimal but sufficient for testing purposes.

End of document.`;

fs.writeFileSync(path.join(__dirname, 'test-document.txt'), testTextContent);
console.log('Created test-document.txt');

console.log('\nAll test files created successfully!');
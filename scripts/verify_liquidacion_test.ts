import fs from 'fs/promises';
import { PDFDocument } from 'pdf-lib';

async function main() {
    const data = await fs.readFile('liquidacion-test.pdf');
    const pdf = await PDFDocument.load(data);
    const subject = pdf.getSubject();
    console.log('PDF Subject metadata:', subject ?? '<none>');
}

main().catch(e => { console.error(e); process.exit(1); });

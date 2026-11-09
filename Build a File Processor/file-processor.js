// Usage: node file-processor-simple.js <file>
// Example: node file-processor-simple.js assets/poem.txt

const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

// 1. Get the file path from the command line
const inputPath = process.argv[2];

if (!inputPath) {
    console.log("Usage: node file-processor-simple.js <file>");
    process.exit(1); // stop the program (1 means "error")
}

if (!fs.existsSync(inputPath)) {
    process.stderr.write("File not found: " + inputPath + "\n");
    process.exit(1);
}

// 2. Work out the names with the path module
const fullPath = path.resolve(inputPath);
const fileName = path.basename(fullPath);
const extension = path.extname(fullPath);

// 3. Make sure the output folder exists
if (!fs.existsSync("output")) {
    fs.mkdirSync("output");
}

const copyPath = path.join("output", fileName);
const reportPath = path.join("output", fileName + ".report.json");

// Never copy a file onto itself (that would erase it)
if (path.resolve(copyPath) === fullPath) {
    process.stderr.write("The input file is already in the output folder. Move it elsewhere first.\n");
    process.exit(1);
}

// 4. Read the file as a stream: hash it, measure it, and copy it
const hash = crypto.createHash("sha256");
let size = 0;

const readable = fs.createReadStream(fullPath); // no encoding, so each chunk is a Buffer
const writeable = fs.createWriteStream(copyPath);

readable.on("data", (chunk) => {
    hash.update(chunk);
    size += chunk.length; // chunk is a Buffer, so .length is its number of bytes
});

readable.on("error", (err) => {
    process.stderr.write("Could not read the file: " + err.message + "\n");
    process.exit(1);
});

readable.pipe(writeable);

// 5. "finish" is the writable stream's version of "end": the copy is complete
writeable.on("finish", () => {
    const report = {
        processedAt: new Date().toISOString(),
        name: fileName,
        extension: extension,
        sizeBytes: size,
        sha256: hash.digest("hex"),
        nodeVersion: process.version,
        platform: process.platform,
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log("File:    " + fileName);
    console.log("Size:    " + size + " bytes");
    console.log("SHA-256: " + report.sha256);
    console.log("Copy:    " + copyPath);
    console.log("Report:  " + reportPath);
});

writeable.on("error", (err) => {
    process.stderr.write("Could not write the file: " + err.message + "\n");
    process.exit(1);
});
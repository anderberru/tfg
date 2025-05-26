const { execSync } = require("child_process");

// https://drive.google.com/file/d/1k7QlhI7fNGt5UKDAiGNuiYbZ_oJ5qjS2/view?usp=sharing
const fileId = "1k7QlhI7fNGt5UKDAiGNuiYbZ_oJ5qjS2";
const output = "vagrant/programs/tensorflow-2.7.1-cp39-cp39-linux_x86_64.whl";

console.log("Descargando archivo desde Google Drive...");
execSync("pip install --quiet gdown", { stdio: "inherit" });
execSync(`gdown https://drive.google.com/uc?id=${fileId} -O ${output}`, { stdio: "inherit" });

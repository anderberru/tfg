const { execSync } = require("child_process");

function getPythonCmd() {
  try {
    execSync("python --version", { stdio: "ignore" });
    return "python";
  } catch {
    try {
      execSync("python3 --version", { stdio: "ignore" });
      return "python3";
    } catch {
      throw new Error("Neither 'python' nor 'python3' is available on this system.");
    }
  }
}

const pythonCmd = getPythonCmd();
const fileId = "1k7QlhI7fNGt5UKDAiGNuiYbZ_oJ5qjS2";
const output = "vagrant/programs/tensorflow-2.7.1-cp39-cp39-linux_x86_64.whl";

console.log("Installing gdown...");
execSync(`${pythonCmd} -m pip install --upgrade --quiet gdown`, { stdio: "inherit" });

console.log("Downloading tensorflow.whl file from Google Drive...");
execSync(`${pythonCmd} -m gdown https://drive.google.com/uc?id=${fileId} -O ${output}`, { stdio: "inherit" });

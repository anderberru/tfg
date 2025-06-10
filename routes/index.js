var express = require('express');
var router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { exec, spawn, execSync } = require('child_process');
const kill = require('tree-kill');
//const { io } = require('../app');

let io;
function setSocket(socketIO) {
  io = socketIO;
};

const vagrantPath = path.join(__dirname, '..', 'vagrant');

let vagrantUp = null;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(vagrantPath, 'scripts', 'custom');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Use original filename
  }
});

const fileFilter = function (req, file, cb) {
  if (file.originalname.endsWith('.sh')) {
    cb(null, true);
  } else {
    cb(new Error('Only .sh files are allowed!'), false);
  }
};

const upload = multer({ storage, fileFilter });

function writeJsonFile(filePath, data) {
  fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
    if (err) {
      console.error('Error writing file:', err);
    } else {
      console.log('JSON file has been saved.');
    }
  });
}

// Function to detect available terminal on Linux
function getLinuxTerminal() {
  const terminals = ['Terminal', 'terminal', 'gnome-terminal', 'terminator', 'konsole', 'xfce4-terminal', 'xterm', 'lxterminal', 'tilix', 'mate-terminal', 'alacritty'];

  for (const term of terminals) {
    //console.log(term)
    try {
      execSync(`which ${term}`, { stdio: 'ignore' });
      console.log(`Found terminal: ${term}`);
      return term;
    } catch (_) {
      // Not found, try next
    }
  }
  return null;
}

function checkProgramInstalled(command, name) {
  return new Promise((resolve) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log(`${name} not found:`, stderr.trim());
        resolve({ name, installed: false });
      } else {
        console.log(`${name} found:`, stdout.trim());
        resolve({ name, installed: true, version: stdout.trim() });
      }
    });
  });
}

async function checkDependencies() {
  const vagrant = await checkProgramInstalled('vagrant --version', 'Vagrant');
  const virtualbox = await checkProgramInstalled('VBoxManage --version', 'VirtualBox');

  return { vagrant: vagrant, virtualbox: virtualbox };
}

/* GET home page. */
router.get('/', function (req, res, next) {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
});

router.get('/checkTools', async (req, res) => {
  const status = await checkDependencies();
  res.json(status);
});

router.post('/vagrantSsh', function (req, res, next) {
  const vmName = req.body.vm_name;
  let command = '';

  if (process.platform === 'win32') {
    // Windows
    command = `start cmd /k "cd /d ${vagrantPath} && vagrant ssh ${vmName}"`;
  } else if (process.platform === 'linux') {
    // Linux
    const terminal = getLinuxTerminal();

    if (!terminal) {
      return res.status(500).json({ error: 'No supported terminal found on Linux.' });
    }

     if (terminal === 'gnome-terminal' || terminal === 'mate-terminal') {
      command = `${terminal} -- bash -c "cd '${vagrantPath}' && vagrant ssh ${vmName}; bash"`;
    } else if (terminal === 'terminator') {
      command = `${terminal} -x bash -c "cd '${vagrantPath}' && vagrant ssh ${vmName}; bash"`;
    } else if (terminal === 'xfce4-terminal') {
      command = `${terminal} --command="bash -c 'cd ${vagrantPath} && vagrant ssh ${vmName}; bash'"`;
    } else {
      command = `${terminal} -e bash -c "cd '${vagrantPath}' && vagrant ssh ${vmName}; bash"`;
    }
    
  } else if (process.platform === 'darwin') {
    // macOS
    command = `osascript -e 'tell app "Terminal" to do script "cd ${vagrantPath} && vagrant ssh ${vmName}"'`;

  } else {
    return res.status(500).json({ error: 'Unsupported platform' });
  }

  exec(command, (err) => {
    if (err) {
      console.error('Error:', err);
      return res.status(500).json({ error: 'Failed to open terminal' });
    } else {
      console.log('Terminal opened and command executed');
      return res.json({ message: 'SSH command executed' });
    }
  });

});

router.post('/saveParameters', function (req, res, next) {
  console.log('saveParameters endpoint hit');
  writeJsonFile(path.join(vagrantPath, 'parameters.json'), req.body);
  res.json({ message: 'Parameters saved' });
}
);

router.get('/readParameters', function (req, res, next) {
  console.log('getParameters endpoint hit');
  const filePath = path.join(vagrantPath, 'parameters.json');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file:', err);
      res.status(500).json({ error: 'Error reading parameters' });
    } else {
      try {
        const jsonData = JSON.parse(data);
        res.json(jsonData);
      } catch (parseErr) {
        console.error('Error parsing JSON:', parseErr);
        res.status(500).json({ error: 'Error parsing parameters' });
      }
    }
  });
});

router.post('/vagrantUp', function (req, res, next) {
  try {
    console.log('vagrantUp endpoint hit');
    let last_line = '';

    writeJsonFile(path.join(vagrantPath, 'parameters.json'), req.body);

    vagrantUp = spawn('vagrant', ['up'], { cwd: vagrantPath });

    let output = '';

    vagrantUp.stdout.on('data', (data) => {
      const line = data.toString();
      last_line = line;
      output += line;
      console.log(line.trim());
      io.emit('vagrant-output', line);
    });

    vagrantUp.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
      output += 'stderr: ' + data.toString();
      last_line = 'stderr: ' + data.toString();
      io.emit('vagrant-output', data.toString());
    });

    vagrantUp.on('close', (code) => {
      const lines = output.trim().split('\n');
      console.log('Vagrant up process finished');
      output = "VAGRANT UP PROCESS:\n" + output + "\nVAGRANT UP PROCESS ENDED\n";
      try {
        if (last_line.includes('stderr:')) {
          console.error('Error in vagrant up:', last_line);
          output += 'Error: ' + last_line;
          res.status(500).json({ error: 'Error during vagrant up', message: output });
          return;
        }
        console.log('Vagrant up completed successfully');
        res.json({ message: output });
      } catch (err) {
        console.error('Error sending response:', err);
        res.status(500).json({ error: 'Error sending final response' });
      }
    });

  } catch (err) {
    console.error('General error in /vagrantUp:', err);
    res.status(500).json({ error: 'Error executing /vagrantUp' });
  }
});


router.get('/vmList', function (req, res, next) {

  console.log('vmList endpoint hit');
  const command = spawn('vagrant', ['status'], { cwd: vagrantPath });
  let vmList = [];
  let output = '';
  let last_line = '';

  command.stdout.on('data', (data) => {
    line = data.toString();
    last_line = line; // keep track of the last line
    output += line; // accumulate output
    vmList.push(line);
    console.log(`${line.trim()}`);
  });

  command.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
    //output += 'stderr: ' + data.toString(); // accumulate output
    last_line = 'stderr: ' + data.toString(); // keep track of the last line
  });

  command.on('close', (code) => {
    const lines = output.trim().split('\n');
    //console.log('File list:', lines);
    console.log('Vagrant status process finished');
    const vmjson = vmList_to_json(lines);

    res.json({ list: vmjson });
  });
});

function vmList_to_json(vmList) {
  const json = [];
  const vmRegex = /^([^\s]+)\s+(running|poweroff|saved|aborted|not created|inaccessible)/;

  vmList.forEach((line) => {
    const match = line.trim().match(vmRegex);
    if (match) {
      const name = match[1];
      const status = match[2];
      json.push({ name, status });
    }
  });

  console.log('JSON:', json);
  return json;
}


router.get('/cancelVagrantUp', (req, res) => {
  if (vagrantUp) {
    kill(vagrantUp.pid, 'SIGKILL', (err) => {
      if (err) {
        console.error('Error killing process:', err);
        res.status(500).json({ message: 'Could not stop vagrant up' });
      } else {
        console.log('Vagrant up process cancelled');
        vagrantUp = null;
        res.json({ message: 'vagrant up cancelled' });
      }
    });
  } else {
    res.status(400).json({ message: 'No active process' });
  }
});

router.get('/vagrantDestroy', function (req, res, next) {
  console.log('vagrantDestroy endpoint hit');

  const command = spawn('vagrant', ['destroy', '-f'], { cwd: vagrantPath });

  let output = '';
  let last_line = '';

  command.stdout.on('data', (data) => {
    line = data.toString();
    last_line = line; // keep track of the last line
    output += line; // accumulate output
    console.log(`${line.trim()}`);
    io.emit('vagrant-output', line);
  });

  command.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
    output += 'stderr: ' + data.toString(); // accumulate output
    last_line = 'stderr: ' + data.toString(); // keep track of the last line
    io.emit('vagrant-output', data.toString());
  });

  command.on('close', (code) => {
    const lines = output.trim().split('\n');
    //console.log('File list:', lines);
    console.log('Vagrant destroy process finished');
    //io.emit('vagrant-output', "\nVAGRANT DESTROY PROCESS ENDED\n");
    io.emit('process-complete', 'Vagrant destroy process finished');
    output = "VAGRANT DESTROY PROCESS:\n" + output + "\nVAGRANT DESTROY PROCESS ENDED\n";
    if (last_line.includes('stderr:')) {
      console.error('Error in vagrant destroy:', last_line);
      output += 'Error: ' + last_line;
      res.status(500).json({ error: 'Error during vagrant destroy', message: output });
      return;
    }
    res.json({ message: output });
  });

});

router.get('/vagrantHalt', function (req, res, next) {
  console.log('vagrantHalt endpoint hit');

  const command = spawn('vagrant', ['halt'], { cwd: vagrantPath });

  let output = '';
  let last_line = '';

  command.stdout.on('data', (data) => {
    line = data.toString();
    last_line = line; // keep track of the last line
    output += line; // accumulate output
    console.log(`${line.trim()}`);
    io.emit('vagrant-output', line);
  });

  command.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
    output += 'stderr: ' + data.toString(); // accumulate output
    last_line = 'stderr: ' + data.toString(); // keep track of the last line
    io.emit('vagrant-output', data.toString());
  });

  command.on('close', (code) => {
    const lines = output.trim().split('\n');
    //console.log('File list:', lines);
    console.log('Vagrant halt process finished');
    //io.emit('vagrant-output', "\nVAGRANT HALT PROCESS ENDED\n");
    io.emit('process-complete', 'Vagrant halt process finished');
    output = "VAGRANT HALT PROCESS:\n" + output + "\nVAGRANT HALT PROCESS ENDED\n";
    if (last_line.includes('stderr:')) {
      console.error('Error in vagrant halt:', last_line);
      output += 'Error: ' + last_line;
      res.status(500).json({ error: 'Error during vagrant halt', message: output });
      return;
    }
    res.json({ message: output });
  });

});


router.post('/uploadFile', upload.single('file'), function (req, res) {
  console.log('uploadFile endpoint hit');
  console.log('File received:', req.file);

  if (!req.file.originalname.endsWith('.sh')) {
    return res.status(400).json({ error: 'Only .sh files are allowed' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file received.' });
  }

  return res.json({ message: 'File uploaded successfully' });
});

module.exports = { router, setSocket };

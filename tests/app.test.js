jest.mock('fs');
jest.mock('child_process', () => {
  const EventEmitter = require('events');

  return {
    exec: jest.fn((cmd, cb) => {
      if (cmd.includes('vagrant ssh')) {
        // Simulate a successful SSH command execution
        cb(null, 'SSH command executed successfully\n', '');
      } else if (cmd.includes('vagrant --version')) {
        cb(null, 'Vagrant 2.3.7\n', '');
      } else if (cmd.includes('VBoxManage')) {
        cb(null, '7.0.10r158379\n', '');
      } else {
        cb(new Error('not found'), '', 'not found');
      }
    }),
    spawn: jest.fn(() => {
      const mockProcess = new EventEmitter();
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();

      // Controlled event emission inside the mock
      setImmediate(() => {
        mockProcess.stdout.emit('data', 'Simulating output\n');
        mockProcess.stderr.emit('data', 'Simulating error\n');
        mockProcess.emit('close', 0);
      });

      return mockProcess;
    }),
  };
});

const fs = require('fs');
const request = require('supertest');
const express = require('express');
const { router } = require('../routes/index'); // adjust the path according to your file location

const indexRoutes = require('../routes/index');

// Only simulate .emit without changing structure
beforeAll(() => {
  // Inject a mock object with emit
  indexRoutes.setSocket({ emit: jest.fn() });
});

const app = express();
app.use(express.json());
app.use('/', router); // mount your router

describe('Vagrant related routes', () => {

  describe('GET /checkTools', () => {
    it('should respond with dependency status', async () => {
      const res = await request(app).get('/checkTools');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('vagrant');
      expect(res.body).toHaveProperty('virtualbox');
    });
  });

  describe('POST /vagrantUp', () => {
    it('should simulate a vagrant up execution', async () => {
      const res = await request(app)
        .post('/vagrantUp')
        .send({ cluster: 'test', nodos: 3 })
        .expect(200);

      expect(res.body.message).toContain('VAGRANT UP PROCESS');
      expect(res.body.message).toContain('Simulating error');
      expect(res.body.message).toContain('Simulating output');
    });
  });

  describe('GET /vmList', () => {
    it('should return an empty list of virtual machines', async () => {
      const res = await request(app).get('/vmList');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("list");
      expect(Array.isArray(res.body.list)).toBe(true);
    });

    it('should return a list of virtual machines', async () => {
      const EventEmitter = require('events');

      require('child_process').spawn.mockImplementationOnce(() => {
        const mockProcess = new EventEmitter();
        mockProcess.stdout = new EventEmitter();
        mockProcess.stderr = new EventEmitter();

        setImmediate(() => {
          mockProcess.stdout.emit('data', 'firewall1 running\n');
          mockProcess.stdout.emit('data', 'firewall2 running\n');
          mockProcess.emit('close', 0);
        });

        return mockProcess;
      });

      const res = await request(app).get('/vmList');
      expect(res.statusCode).toBe(200);
      expect(res.body.list).toEqual([
        { name: 'firewall1', status: 'running' },
        { name: 'firewall2', status: 'running' }
      ]);
    });

  });

  describe('GET /vagrantDestroy', () => {
    it('should simulate a vagrant destroy execution', async () => {
      const res = await request(app).get('/vagrantDestroy');
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('VAGRANT DESTROY PROCESS');
      expect(res.body.message).toContain('Simulating output');
    });
  });

  describe('GET /vagrantHalt', () => {
    it('should simulate a vagrant halt execution', async () => {
      const res = await request(app).get('/vagrantHalt');
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('VAGRANT HALT PROCESS');
      expect(res.body.message).toContain('Simulating output');
    });
  });

  describe('POST /vagrantSsh', () => {
    it('should simulate a vagrant ssh execution', async () => {
      const res = await request(app)
        .post('/vagrantSsh')
        .send({ vm_name: 'firewall1' })
        .expect(200);

      expect(res.body.message).toContain('SSH command executed');
    });

    it('should give an error message', async () => {
      const { exec } = require('child_process');
      const execMock = jest.spyOn(require('child_process'), 'exec').mockImplementation((cmd, cb) => {
        cb(new Error('vagrant ssh error'), 'Mocked exec output', '');
      });
      const res = await request(app)
        .post('/vagrantSsh')
        .send({ aaaa: '' })
        .expect(500);

      expect(res.body.error).toContain('Failed to open terminal');
      execMock.mockRestore();
    });
  });

});

describe('Tests for /readParameters and /saveParameters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /readParameters returns mocked data', async () => {
    const fakeJson = { test: 'ok' };

    fs.readFile.mockImplementation((path, encoding, callback) => {
      callback(null, JSON.stringify(fakeJson));
    });

    const res = await request(app).get('/readParameters');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(fakeJson);
  });

  it('POST /saveParameters saves JSON', async () => {
    fs.writeFile.mockImplementation((path, data, callback) => {
      callback(null);
    });

    const payload = { ejemplo: 'valor' };

    const res = await request(app)
      .post('/saveParameters')
      .send(payload);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Parameters saved');
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('parameters.json'),
      JSON.stringify(payload, null, 2),
      expect.any(Function)
    );
  });
});

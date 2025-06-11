To run this application, you need to install [Vagrant](https://developer.hashicorp.com/vagrant/install), [VirtualBox](https://www.virtualbox.org/wiki/Downloads) and [NodeJS](https://nodejs.org/en/download).

## Installation
1. Clone the repository
2. Run the following command to install all dependencies and to compile the React interface:
   ```
   npm run setup
   ```
3. To run the app:
   ```
   npm start
   ```
4. Visit http://localhost:3000/ on your browser


To run unit tests:
```
npm test
```

To compile the frontend:
```
npm run build
```

If the application gives this error when creating a virtual machine:
**The IP address configured for the host-only network is not within the allowed ranges.**

Write this line in **/etc/vbox/networks.conf** (create the file if it doesn't exist):
```
* 0.0.0.0/0
```

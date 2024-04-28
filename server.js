const express = require('express');
const config = require('./config.json');
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');
const sequelize = require('./database');
const Camera = require('./models/CameraModel');
const readline = require('node:readline');
const http = require('http');




const app = express();

// Configure session
app.use(
    session({
      secret: config.sessionsecret,
      resave: false,
      saveUninitialized: false,
      cookie: { secure: config.https }
    }));


// Set Pug as the view engine
app.set('view engine', 'pug');

// Set the directory where Pug templates are located (optional)
app.set('views', path.join(__dirname, 'views'));

app.use("/public", express.static(path.join(__dirname, 'public')));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())


// Show homepage
app.get('/', async (req, res) => {
    const allCameras = await Camera.findAll();

    const groups = [...new Set(allCameras.map(item => item.group))];

    const camerasByGroup = new Map();

    const tablesByGroup = new Map();

    groups.forEach(group => {
      groupCameras = allCameras.filter((c) => c.group == group);
      camerasByGroup.set(group, groupCameras);

      table = [];
      let i = 0;
      groupCameras.forEach(camera => {
        table.push([`${camera.camNumber}`, `${camera.ipAddress}`])
      })

      tablesByGroup.set(group, table);
    });

    res.render('index', { camerasByGroup: camerasByGroup, groups: groups, tablesByGroup: tablesByGroup, config: config });
  });

  app.get('/mass', async (req, res) => {
    switch(req.query.type) {
      case 'scene': {

        const group = decodeURI(req.query.group);

        // Changing a scene file
        let camerasToChange;
        if(group == 'all') {
          camerasToChange = await Camera.findAll();
        } else {
          camerasToChange = await Camera.findAll({ where: { group: group }});
        }

        let ips = camerasToChange.map(cam => cam.ipAddress);

        sendMassSceneChange(req.query.mode.toLowerCase(), ips);

        break;
      }
    }
    res.redirect('/');
  })
  
  app.use("/public", express.static(path.join(__dirname, 'public')));


// Start the server
sequelize.sync().then(() => {
    app.listen(3000, () => {
      console.log('Server is running on port 3000');
      questionLoop();
    });
  });

// Handle Command Line Input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout, 
  });

const prompt = (query) => new Promise((resolve) => rl.question(query, resolve));


async function questionLoop() {
    let running = true;
    while(running) {
        const answer = await prompt('What would you like to do?\n1) Add a new camera(s)\n2) Mass Change Settings\n3) Change IP Address\n4) Show Current Cameras\n5) Delete a Group\n6) Delete a Camera\n');
        if(answer == "1") { // Add a new camera
          const camNumbers = [];
          const cameraNumberReply = await prompt('What are the Camera Number(s) (If multiple, set range with \'-\'): ');

          if(cameraNumberReply.includes('-')) {
            // If a multiple array has been given
            const camNumbersReplyArray = cameraNumberReply.split('-');
            for(let i = camNumbersReplyArray[0]; i <= camNumbersReplyArray[1]; i++) {
              camNumbers.push(parseInt(i));
            }
          } else {
            // If it's only 1 camera
            camNumbers.push(parseInt(cameraNumberReply));
          }
          console.log(`Adding ${camNumbers.length} cameras, please set the IP Addresses below`);
          const ipAddresses = [];
          const ipAddressesReply = await prompt('What IP Address(es) do you want to use');
          if(ipAddressesReply.includes('-')) {
            const ip4Octs = ipAddressesReply.split('.');
            const ipReplyArray = ip4Octs[3].split('-');
            for(let i = ipReplyArray[0]; i <= ipReplyArray[1]; i++) {
              const singleIp = `${ip4Octs[0]}.${ip4Octs[1]}.${ip4Octs[2]}.${i}`;
              ValidateIPaddress(singleIp);
              ipAddresses.push(singleIp);
            }
          } else {
              ValidateIPaddress(ipAddressesReply);
              ipAddresses.push(ipAddressesReply);
          }


          const group = await prompt('What group are these cameras: ');

          for(let i = 0; i < camNumbers.length; i++) {
            console.log(camNumbers[i]);
            await Camera.create({ camNumber: camNumbers[i], ipAddress: ipAddresses[i], group: group });
          }

          
        } else if (answer == "2") { // Mass Change Camera Settings
          const group = await prompt('What group would you like to change? ');

          const camerasToChange = await Camera.findAll({ where: { group: group }});

          let ips = camerasToChange.map(cam => cam.ipAddress);
          
          const setting = await prompt('What setting would you like to change? (scene/gain)');
          if(setting.toLowerCase() == 'scene') {
            const mode = await prompt('What mode would you like? (Day/Night/IR)');
            sendMassSceneChange(mode.toLowerCase(), ips);
          } else if (setting.toLowerCase() == 'gain') {
            const db = await prompt('What db? (-6, 0, 6)')
            sendMassGainChange(db, ips);
          }



        } else if (answer == "3") { // Change an IP Address
          console.log('tbc, please delete and readd for now');
        } else if (answer == "4") { // Show current camera list
          const cameras = await Camera.findAll();
          cameras.forEach(camera => {
            console.log(`Cam No: ${camera.camNumber}, IP: ${camera.ipAddress}, group: ${camera.group}`);
          })
        } else if (answer == "5" || answer == "6") { // Delete cameras or a whole group
          let cameras;
          if(answer == '5') {
            const whatGroup = await prompt('What group do you want to delete (Permanant Action!): ');
            cameras = await Camera.findAll({ where: { group: whatGroup}});
          } else if (answer == '6') {
            const whatCamera = await prompt('What camera do you want to delete (Cam No) (Permanant Action!): ');
            cameras = await Camera.findAll({ where: { camNumber: whatCamera } });
          }
          cameras.forEach((camera) => {
            camera.destroy();
          })

          

        } else if (answer == "0") { // Show Debug
          const cameras = await Camera.findAll();          ;
          console.log(cameras);
        }
    }
}

// Check IP Addresses
function ValidateIPaddress(ipaddress) {  
  if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipaddress)) {  
    return (true)  
  }  
  alert("You have entered an invalid IP address!")  
  return (false)  
}  

const modes = new Map();

modes.set('day', 'XSF:1&res=1');
modes.set('night', 'XSF:2&res=1');
modes.set('ir', 'XSF:3&res=1');

// Send GET Scene Request to Cameras
function sendMassSceneChange(mode, ipAddresses) {
  const urlMode = modes.get(mode);

  ipAddresses.forEach(ip => {
    let url = `http:///${ip}/cgi-bin/aw_cam?cmd=${urlMode}`
    console.log(url);
  
    http.get(url, (res) => {
      const { statusCode } = res;

      let err;

      if(statusCode != 200) {
        console.log(statusCode);
      } else {
        err = new Error('Request Failed.\n' +
        `Status Code: ${statusCode}`);
      }

      if(err) {
        console.error(err.message);
        res.resume;
        return;
      }
    }).on('error', function(err) {
      if(err.code == 'ETIMEDOUT') {
        console.log(`No Reply> IP Address: ${err.address}`);
      } else {
        console.error(err);
      }
    }) ;

  });

}

const dbMap = new Map();

dbMap.set('-6', 'OGU:02h');
dbMap.set('0', 'OGU:08h');
dbMap.set('6', 'OGU:10h');

// Send GET Gain Request to Cameras
function sendMassGainChange(db, ipAddresses) {
  const cmd = dbMap.get(db);

  ipAddresses.forEach(ip => {
    let url = `http:///${ip}/cgi-bin/aw_cam?cmd=${cmd}`
    console.log(url);
  
    http.get(url, (res) => {
      const { statusCode } = res;
      if(statusCode != 200) {
        console.log(statusCode);
      }
    });

  });

}


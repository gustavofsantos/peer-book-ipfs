const path = require('path');
const fs = require('fs');

function store(data, relativeLocal) {
  const local = path.join(__dirname, relativeLocal);
  return new Promise((resolve, reject) => {
    fs.writeFile(local, data, err => {
      if (!err) resolve();
      else reject(err);
    });
  });
}

function load(relativeLocal) {
  const local = path.join(__dirname, relativeLocal);
  return new Promise((resolve, reject) => {
    fs.readFile(local, (err, bdata) => {
      if (!err) resolve(bdata.toString());
      else reject(err);
    });
  });
}

module.exports = {
  store,
  load
}
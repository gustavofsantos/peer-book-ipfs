const IPFS = require('ipfs');
const path = require('path');
const fs = require('fs');

const Package = require('./package');
const Me = require('./me');
const {
  store,
  load
} = require('./node-storage');

const feed = [];
const feedSaveInterval = setInterval(saveFeed, 300000);
let feedHandler;
let me;

const node = new IPFS({
  config: {
    Addresses: {
      Swarm: [
        "/dns4/wrtc-star.discovery.libp2p.io/tcp/443/wss/p2p-webrtc-star"
      ]
    }
  },
  EXPERIMENTAL: {
    pubsub: true
  }
});

/** IPFS node operations **/
function ready() {
  return new Promise((resolve, reject) => {
    node.on('ready', () => {
      init()
        .then(resolve)
        .catch(reject);
    });
  });
}

async function init() {
  try {
    await loadFeed();
  } catch (error) {
    console.error(error);
  } finally {
    node.on('init', handlerInit);
    node.on('error', handlerError);
    node.on('start', handlerStart);
    node.on('stop', handlerStop);
  }
}

/** My profile **/
async function shareMyself() {
  try {
    const sme = me.toString();
    const res = await node.files.add(node.types.Buffer.from(sme));
    return res.hash;
  } catch (error) {
    console.error(error);
    return null;
  }
}

function createLocalProfile(profile) {
  return new Promise((resolve, reject) => {
    node.id()
      .then(nodeId => {
        profile.id = nodeId.id;
        profile.publicKey = nodeId.publicKey;

        me = new Me(profile);
        me.save()
          .then(resolve)
          .catch(reject);
      })
  });
}

function loadLocalProfile() {
  const profilePath = path.join(__dirname, '../data/profile.json');
  return new Promise((resolve, reject) => {
    fs.readFile(profilePath, (err, bdata) => {
      if (!err) {
        const sdata = bdata.toString();
        const profile = JSON.parse(sdata);
        me = new Me(profile);

        resolve(this.me);
      } else {
        reject(err);
      }
    });
  });
}

function subscribeFolloersFeed() {
  return new Promise((resolve, reject) => {
    const subscriptions = this.me.followers.map(followerId =>
      node.pubsub.subscribe(followerId, onReceiveData, err => {
        if (err) {
          console.error(err);
        }
      })
    );

    Promise.all(subscriptions)
      .then(resolve)
      .catch(reject);
  });
}

function subscribeFollower(followId) {
  return new Promise((resolve, reject) => {
    node.pubsub.subscribe(followId, onReceiveData, err => {
      if (!err) resolve(followId);
      else reject(err);
    });
  })
}

async function unsubscribeFollower(followId) {
  try {
    await node.pubsub.unsubscribe(followId);
    return followId;
  } catch (error) {
    console.error(error);
  }
} 

function followPerson(followId) {
  return new Promise((resolve, reject) => {
    me.follow(followId);
    me.save()
      .then(() => {
        subscribeFollower(followId)
          .then(resolve)
          .catch(reject);
      })
      .catch(reject);
  });
}

async function unfollowPerson(followId) {
  me.unfollow(followId);
  try {
    await unsubscribeFollower(followId);
    return followId;
  } catch (error) {
    console.error(error);
  }
}

/** Handlers **/
function handlerInit() {
  console.log('[IPFS] Node is initialized.');
}

function handlerError(err) {
  console.error('[IPFS] Error: ', err.message);
}

function handlerStart() {
  console.log('[IPFS] Node is started.');
}

function handlerStop() {
  console.log('[IPFS] Node is stopped.');
}


/** Feed operations **/
async function saveFeed() {
  console.log('saving feed...');
  try {
    if (feed.length > 0) {
      await store(JSON.stringify(feed, null, 2), '../data/feed.json');
    }
  } catch (error) {
    console.error(error);
  }
}

async function loadFeed() {
  try {
    const sfeed = await load('../data/feed.json');
    feed = JSON.parse(sfeed);
  } catch (error) {
    console.error(error);
  }
}

function setOnFeedUpdate(handler) {
  feedHandler = handler;
}

/**
 * Publish a post in the user feed
 * @param {String} stringContent Content of the post that the user is publishing.
 */
function publish(stringContent, options = {}) {
  return new Promise((resolve, reject) => {
    const pak = new Package({
      type: 'post',
      content: stringContent,
      contentSign: '',
      creator: this.me.id,
      tags: options.tags
    });

    const spak = JSON.stringify(pak);
    node.pubsub.publish(me.id, node.types.Buffer.from(spak), err => {
      if (!err) {
        if (options.keep) {
          node.files.add(node.types.Buffer.from(pak), (err, res) => {
            if (!err) {
              resolve(res);
            } else {
              reject(err);
            }
          });
        } else {
          resolve();
        }
      } else {
        reject(err);
      }
    });
  });
}

/**
 * 
 * @param {string} stringContent 
 * @param {string} destinationId 
 * @param {object} options 
 */
async function send(stringContent, destinationId, options = {}) {
  try {
    const pak = new Package({
      type: 'message',
      content: stringContent,
      contentSign: '',
      creator: me.id,
      destination: destinationId
    });

    const spak = JSON.stringify(pak);

    await node.pubsub.publish(destinationId, node.types.Buffer.from(spak));

    if (options.keep) {
      const {
        hash
      } = await node.files.add(node.types.Buffer.from(spak));
      return hash;
    }
    return;
  } catch (error) {
    console.error(error);
    return null;
  }
}

/**
 * Only can be called after the node starts.
 */
function subscribeMyFeed() {
  return new Promise((resolve, reject) => {
    node.pubsub.subscribe(me.id, onReceiveData, err => {
      if (!err) resolve(me.id);
      else reject(err);
    });
  });
}

/**
 * Check if the this package comes from the peer that are blocked
 * @param {Package} pak A package
 * @returns {boolean}
 */
function isFromBlocked(pak) {
  const peerId = pak.creator;
  const index = me.blockeds.indexOf(peerId);

  if (index > -1) {
    // blockeds contains peer id, this peer is blocked
    return true;
  }
  return false;
}

function cancelFeedAutoSave() {
  clearInterval(feedSaveInterval);
}

/** Package operations **/
function onReceiveData(incoming) {
  const spak = incoming.data.toString();
  const pak = JSON.parse(spak);

  onReceivePackage(new Package(pak));
}

async function onReceivePackage(pak) {
  if (!isFromBlocked(pak)) {
    try {
      await processReceivedPackage(pak);
    } catch (error) {
      console.error(error);
    }
  }
}

function onFeedUpdate(pak) {
  console.log('package added to feed');

  if (feedHandler && typeof feedHandler === 'function') {
    feedHandler(pak, feed);
  }

  console.log(this.feed);
}

/**
 * 
 * @param {Package} pak 
 */
async function processReceivedPackage(pak) {
  try {
    feed.push(pak);
    onFeedUpdate(pak);

    if (pak.keep) {
      // adds to ipfs as file
      const {
        hash
      } = await node.files.add(node.types.Buffer.from(pak.toString()));
      return hash;
    }

    return true;
  } catch (error) {
    console.error(error);
    return null;
  }
}

module.exports = {
  ready,
  createLocalProfile,
  loadLocalProfile,
  cancelFeedAutoSave,
  publish,
  send,
  subscribeMyFeed,
  followPerson,
  unfollowPerson,
  setOnFeedUpdate
}
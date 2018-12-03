const IPFS = require('ipfs');
const path = require('path');
const fs = require('fs');

const Package = require('./package');
const Me = require('./me');
const {
  store,
  load
} = require('./node-storage');

class Peer {
  constructor() {
    this.node = new IPFS({
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

    this.node.on('init', this.handlerInit);
    this.node.on('error', this.handlerError);
    this.node.on('start', this.handlerStart);
    this.node.on('stop', this.handlerStop);

    this.feedSaveInterval = setInterval(this.saveFeed, 300000);

    this.feed = [];
  }

  ready() {
    return new Promise((resolve) => {
      this.node.on('ready', () => {
        resolve();
      });
    });
  }

  async shareMyself() {
    try {
      const me = this.me.toString();
      const res = await this.node.files.add(this.node.types.Buffer.from(me));
      return res.hash;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  createLocalProfile(profile) {
    return new Promise((resolve, reject) => {
      this.node.id()
        .then(nodeId => {
          profile.id = nodeId.id;
          profile.publicKey = nodeId.publicKey;

          this.me = new Me(profile);

          this.me.save()
            .then(resolve)
            .catch(reject);
        })
    });
  }

  loadLocalProfile() {
    const profilePath = path.join(__dirname, '../data/profile.json');
    return new Promise((resolve, reject) => {
      fs.readFile(profilePath, (err, bdata) => {
        if (!err) {
          const sdata = bdata.toString();
          const profile = JSON.parse(sdata);
          this.me = new Me(profile);

          resolve(this.me);
        } else {
          reject(err);
        }
      });
    });
  }

  handlerInit() {
    console.log('[IPFS] Node is initialized.');
  }

  handlerError(err) {
    console.error('[IPFS] Error: ', err.message);
  }

  handlerStart() {
    console.log('[IPFS] Node is started.');
  }

  handlerStop() {
    console.log('[IPFS] Node is stopped.');
  }

  /**
   * Publish a post in the user feed
   * @param {String} stringContent Content of the post that the user is publishing.
   */
  publish(stringContent, options = {}) {
    return new Promise((resolve, reject) => {
      const pak = new Package({
        type: 'post',
        content: stringContent,
        contentSign: '',
        creator: this.me.id,
        tags: options.tags
      });

      const spak = JSON.stringify(pak);
      this.node.pubsub.publish(this.me.id, this.node.types.Buffer.from(spak), err => {
        if (!err) {
          if (options.keep) {
            this.node.files.add(this.node.types.Buffer.from(pak), (err, res) => {
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
  async send(stringContent, destinationId, options = {}) {
    try {
      const pak = new Package({
        type: 'message',
        content: stringContent,
        contentSign: '',
        creator: this.me.id,
        destination: destinationId
      });

      const spak = JSON.stringify(pak);

      await this.node.pubsub.publish(destinationId, this.node.types.Buffer.from(spak));

      if (options.keep) {
        const {
          hash
        } = await this.node.files.add(this.node.types.Buffer.from(spak));
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
  subscribeMyFeed() {
    return new Promise((resolve, reject) => {
      this.node.pubsub.subscribe(this.me.id, this.onReceivePackage, err => {
        if (!err) resolve(this.me.id);
        else reject(err);
      });
    });
  }

  subscribeFolloersFeed() {
    return new Promise((resolve, reject) => {
      const subscriptions = this.me.followers.map(followerId =>
        this.node.pubsub.subscribe(followerId, this.onReceivePackage, err => {
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

  subscribeFolloer(followId) {
    return new Promise((resolve, reject) => {
      this.node.pubsub.subscribe(followId, this.onReceivePackage, err => {
        if (!err) resolve(followId);
        else reject(err);
      });
    })
  }

  followPerson(followId) {
    return new Promise((resolve, reject) => {
      this.me.follow(followId);
      this.me.save()
        .then(() => {
          this.subscribeFollower()
            .then(resolve)
            .catch(reject);
        })
        .catch(reject);
    });
  }

  onReceivePackage(incoming) {
    const spak = incoming.data.toString();
    const pak = JSON.parse(spak);

    this.isFromBlocked
    if (!this.isFromBlocked(pak)) {
      this.processReceivedPackage(pak);
    }
  }

  /**
   * 
   * @param {Package} pak 
   */
  async processReceivedPackage(pak) {
    try {
      this.feed.push(pak);
      this.onFeedUpdate(pak);

      if (pak.keep) {
        // adds to ipfs as file
        const {
          hash
        } = await this.node.files.add(this.node.types.Buffer.from(JSON.stringify(pak)));
        return hash;
      }

      return true;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  onFeedUpdate(pak) {
    console.log('package added to feed');
    console.log(this.feed);
  }

  async saveFeed() {
    console.log('saving feed...');
    try {
      await store(JSON.stringify(this.feed, null, 2), '../data/feed.json');
    } catch (error) {
      console.error(error);
    }
  }

  async loadFeed() {
    try {
      const sfeed = await load('../data/feed.json');
      this.feed = JSON.parse(sfeed);
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * @returns {string}
   */
  exportMeString() {
    return this.me.toString();
  }

  /**
   * Check if the this package comes from the peer that are blocked
   * @param {Package} pak A package
   * @returns {boolean}
   */
  isFromBlocked(pak) {
    const peerId = pak.creator;
    const index = this.me.blockeds.indexOf(peerId);

    if (index > -1) {
      // blockeds contains peer id, this peer is blocked
      return true;
    }
    return false;
  }
}

module.exports = Peer;
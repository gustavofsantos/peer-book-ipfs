const { store, load } = require('./node-storage');
const Profile = require('./profile');

class Me extends Profile {
  constructor(options = {}) {
    super(options);
  }

  /**
   * Following a person will add the person id to the pubsub to
   * listen for new posts. All the previously posts will be downloaded
   * to be accessed offline.
   * @param {String} personId Peer id from a person to follow
   */
  follow(personId) {
    this.followers.push(personId);
  }

  /**
   * Unfolloing a person will delete all locally posts from this person
   * and the person feed will be unsubscribed.
   * @param {String} personId Peer id from a person to unfollow
   * @returns {String | null} Return null if the person id is not followed
   */
  unfollow(personId) {
    const index = this.followers.indexOf(personId);
    if (index > -1) {
      const unfollowed = this.followers.splice(index, 1);
      return unfollowed;
    }

    return null;
  }

  /**
   * All posts from the ids that the person have blocked will never be 
   * visible, even stored offline.
   * @param {String} personId Peer id from a person to block
   */
  block(personId) {
    this.blockeds.push(personId);
  }

  /**
   * All posts from this peer id will now be visible
   * @param {String} personId Peer id to unblock
   * @returns {String | null} Return null if the id is not blocked
   */
  unblock(personId) {
    const index = this.blockeds.indexOf(personId);
    if (index > -1) {
      const unblocked = this.blockeds.splice(index, 1);
      return unblocked;
    }

    return null;
  }

  /**
   * Will sync all posts from the persons that the person follow
   */
  sync() {

  }

  /**
   * Save the actual snapshot of my profile into storage
   */
  async save() {
    try {
      await store(this.toString(), '../data/profile.json');
    } catch (error) {
      console.error(error);
    }
  }
  
  /**
   * Load the stored profile to the memory
   */
  async load() {
    try {
      const sprofile = await load('../data/profile.json');
      const profile = JSON.parse(sprofile);
      profile.since = Date(profile.since);
      this.import(profile);
      return profile;
    } catch (error) {
      console.error(error);
      return null;
    }
  }
}

module.exports = Me;
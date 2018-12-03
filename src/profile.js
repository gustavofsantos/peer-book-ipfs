/**
 * name: string
 * description: string
 * id: Peed id
 * avatar: IPFS CID from a image
 * publicKey: string
 * posts: Array of IPFS CIDs that represents my posts
 * followers: Array of peer ids
 * blockeds: Array of peer ids
 * since: Date of creatin of this profile
 */
class Profile {
  constructor(options = {}) {
    this.name = options.name || 'anonymous';
    this.description = options.description || '';
    this.id = options.id || '';
    this.avatar = options.avatar || '';
    this.publicKey = options.publicKey || '';
    this.posts = options.posts || [];
    this.followers = options.followers || [];
    this.blockeds = options.blockeds || [];
    this.since = options.since || Date.now().toString();
  }

  /**
   * @returns {String}
   */
  toString() {
    const json = {
      name: this.name,
      description: this.description,
      id: this.id,
      publicKey: this.publicKey,
      posts: this.posts,
      followers: this.followers,
      blockeds: this.blockeds,
      since: this.since
    }

    const exp = JSON.stringify(json, null, 2);
    return exp;
  }

  exportShortString() {
    const json = {
      name: this.name,
      description: this.description,
      id: this.id,
      publicKey: this.publicKey,
    }

    const exp = JSON.stringify(json, null, 2);
    return exp;
  }

  import(options) {
    this.name = options.name || 'anonymous';
    this.description = options.description || '';
    this.id = options.id || '';
    this.publicKey = options.publicKey || '';
    this.posts = options.posts || [];
    this.followers = options.followers || [];
    this.blockeds = options.blockeds || [];
    this.since = options.since || Date.now();
  }
}

module.exports = Profile;
/**
 * 
 * Package
 * =======
 * 
 * type: message | post
 * tymestamp: number
 * creator: {
 *   id: string
 *   pubKey: string
 * },
 * content: string
 * contentSign: string
 * keep: boolean
 * destination: {
 *   id: string,
 *   pubKey: string
 * }
 * tags: Array<string>
 */
class Package {
  /**
   * Create a new Package object that can be a message or a post
   * @param {object} options Package options
   */
  constructor(options = {}) {
    // fields that booth types have
    this.type = options.type || null;
    this.content = options.content || null;
    this.contentSign = options.contentSign || null;
    this.creator = options.creator || {}; // { id, pubKey }
    this.timestamp = Date.now;
    // 0 means that this post should never be deleted automatically
    // another value, is a date that this message need to be deleted
    this.keep = options.keep || true;

    // post
    this.tags = options.tags || [];

    // message
    this.destination = options.destination || {}; // { id, pubKey }
  }

  toJSON() {
    const pak = {
      type: this.type,
      creator: this.creator,
      content: this.content,
      contentSign: this.contentSign,
      keep: this.keep
    };

    if (this.type === 'message') {
      pak.destination = this.destination;
    } else if (this.type === 'post') {
      pak.tags = this.tags;
    } 

    return pak;
  }

  toString() {
    return JSON.stringify(this.toJSON());
  }

  toBuffer() {
    return Buffer.from(this.toString());
  }
}

module.exports = Package;
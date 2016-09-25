class PanopticClient {
  constructor(janusServerAddress) {
    if (! janusServerAddress)
      throw "No server address specified";
    this.janusServerAddress = janusServerAddress;
  }

  // initialize client, connect, attach streaming plugin client, retrieve stream list
  // resolves promise with streamList eventually if successful.
  init() {
    return new Promise((resolve, reject) => {
      Janus.init({
        debug: "all",
        callback: () => {
          if (! Janus.isWebrtcSupported()) {
            reject("Your browser does not support video streaming.");
            return;
          }
          this.connect().then((streamList) => {
            resolve(streamList);
          }).catch((err) => { reject(err) });
        }
      });
    });
  }

  // janus is initialized, create client connection
  // returns promise that is called when streams are listed
  connect() {
    console.debug(`Connecting to ${this.janusServerAddress}`);
    let streamClientPromise = new Promise((resolve, reject) => {
      this.streamingClient = new Janus({
        'server': this.janusServerAddress,
        'success': () => {
          this.streamingClient.attach({
            plugin: "janus.plugin.streaming",
            success: (handle) => {
              console.debug("Got handle for " + handle.getPlugin());
              this.streamingHandle = handle;
              this.updateStreamsList((list) => {
                if (list)
                  resolve(list);
                else
                  reject("Failed to list streams");
              });
            },
            error: (err) => {
              this.streamingHandle = null;
              reject(`Error attaching to streaming plugin: ${err}`);
            }
          });
        },
        'error': (err) => {
          reject(`Failed to initialize Janus client: ${err}`);
        }
      });
    });
    return streamClientPromise;
  }

  // fetch a list of available streams
  // calls callback with a list of streams
  updateStreamsList(callback=null) {
    var body = { "request": "list" };
    this.streamingHandle.send({
      "message": body,
      success: (result) => {
        if (! result) {
          console.warning("Failed to get streams list");
          return;
        }
        let streamList = result['list'];
        if (callback) {
          callback(streamList);
        }

        this.streamsList = streamList;
      }
    });
  }
}
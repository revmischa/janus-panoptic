class PanopticClient {
  constructor(janusServerAddress) {
    if (! janusServerAddress)
      throw "No server address specified";
    this.janusServerAddress = janusServerAddress;
    this.streamStartedPromises = {};  // map of streamId => promise resolve func
  }

  // initialize client, connect, attach streaming plugin client, retrieve stream list
  // resolves promise with streamList eventually if successful
  init() {
    return new Promise((resolve, reject) => {
      Janus.init({
        // debug: "all",
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
            onmessage: (msg, jsep) => {
              // console.debug(`Got janus message ${msg}, jsep=${jsep}`);
              let result = msg["result"];
              if (! result) {
                console.error(`Didn't get result in streaming client message?? ${msg}`);
                return;
              }
              if (result["status"]) {
                let status = result["status"];
                switch (status) {
                  case 'starting':
                    console.debug("Stream starting");
                    break;
                  case 'started':
                    console.debug("Stream started");
                    break;
                  case 'stopped':
                    console.debug("Stream stopped");
                    break;
                }
              } else if(msg["error"]) {
                console.error(`Stream message error: ${msg['error']}`);
                return;
              }

              // are we being offered a media stream? if so, respond
              // with a request to receive
              if (jsep) {
                console.debug("Got SDP offer");
                console.debug(jsep);
                // reply with our request to receive
                this.streamingHandle.createAnswer({
                  jsep: jsep,
                  media: { audioSend: false, videoSend: false },  // We want recvonly audio/video
                  success: (jsep) => {
                    Janus.debug("Got SDP!");
                    Janus.debug(jsep);
                    let body = { "request": "start" };
                    this.streamingHandle.send({ "message": body, "jsep": jsep });
                    // ...
                  },
                  error: (error) => {
                    console.error(`WebRTC error: ${error}`);
                  }
                });
              } // jsep
            },
            onremotestream: (stream) => {
              console.debug(`Got remote stream ${stream}`);
              console.debug(stream);
              console.debug(`STREAM ID: ${stream.id}`);
              let streamId = Object.keys(this.streamStartedPromises)[0];
              let streamStartedPromise = this.streamStartedPromises[streamId];
              if (! streamStartedPromise) {
                console.warn("Got stream start but no promise was found for handling it");
                return;
              }
              streamStartedPromise(stream);
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

  startStream(streamId) {
    let id = parseInt(streamId);
    var body = { "request": "watch", "id": id };
    this.streamStartedPromise = new Promise((resolve, reject) => {
      this.streamStartedPromises[id] = (stream) => {
        resolve(stream);
      };
      this.streamingHandle.send({ "message": body, success: (res) => {
        console.info("RES");
        console.log(res);
      }});
    });
    return this.streamStartedPromise;
  }
}
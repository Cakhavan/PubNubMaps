
import React, {Component} from 'react';
import {Platform, StyleSheet, Text, View} from 'react-native';
import MapView, {Marker} from 'react-native-maps';
import PubNubReact from 'pubnub-react';

type Props = {};
export default class App extends Component<Props> {


  constructor(props) {
    super(props);
    //Base State
    this.state = {
      currentLoc: {
        latitude: -1,
        longitude: -1
      },
      //numUsers: 0,
      //username: "A Naughty Moose",
      fixedOnUUID: "",
      //focusOnMe: false,
      users: new Map(),
      //splashLoading: true,
      //shift: new Animated.Value(0),
      //currentPicture: null,
      //isFocused: false,
      //allowGPS: true,
    };

    this.pubnub = new PubNubReact({
      publishKey: "pub-c-d93d7b15-4e46-42f4-ba03-c5d997844b9e",
      subscribeKey: "sub-c-1ef826d4-78df-11e9-945c-2ea711aa6b65"
    });

    this.pubnub.init(this);
  }


  async setUpApp(){

    this.pubnub.getMessage("global", msg => {
      let users = this.state.users;
      if (msg.message.hideUser) {
        users.delete(msg.publisher);
        this.setState({
          users
        });
      }else{
        coord = [msg.message.latitude, msg.message.longitude]; //Format GPS Coordinates for Payload

        let oldUser = this.state.users.get(msg.publisher);

        let newUser = {
          uuid: msg.publisher,
          latitude: msg.message.latitude,
          longitude: msg.message.longitude,
        };

        if(msg.message.message){
          Timeout.set(msg.publisher, this.clearMessage, 5000, msg.publisher);
          newUser.message = msg.message.message;
        }else if(oldUser){
          newUser.message = oldUser.message
        }
        this.updateUserCount
        users.set(newUser.uuid, newUser);

        this.setState({
          users
        });

      }

    });

    this.pubnub.subscribe({
      channels: ["global"],
    });

    //Get Stationary Coordinate
    navigator.geolocation.getCurrentPosition(
      position => {
        if (this.state.allowGPS) {
          this.pubnub.publish({
            message: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            },
            channel: "global"
          });
          let users = this.state.users;
          let tempUser = {
            uuid: this.pubnub.getUUID(),
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          users.set(tempUser.uuid, tempUser);
          this.setState({
            users,
            currentLoc: position.coords
          });
        }
      },
      error => console.log("Maps Error: ", error),
      { enableHighAccuracy: true,}
    );

    //Track motional Coordinates
    navigator.geolocation.watchPosition(
      position => {
        this.setState({
          currentLoc: position.coords
        });
        if (this.state.allowGPS) {
          this.pubnub.publish({
            message: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            },
            channel: "global"
          });
        }
      },
      error => console.log("Maps Error: ", error),
      {
        enableHighAccuracy: true,
        distanceFilter: 100
      }
    );
  }


  componentDidUpdate(prevProps, prevState) {

      if (this.state.allowGPS) {
        
        let users = this.state.users;
        let tempUser = {
          uuid: this.pubnub.getUUID(),
          latitude: this.state.currentLoc.latitude,
          longitude: this.state.currentLoc.longitude,
        };
        users.set(tempUser.uuid, tempUser);
        this.setState(
          {
            users
          },
          () => {
            this.pubnub.publish({
              message: tempUser,
              channel: "global"
            });
          }
        );
      } else {
        let users = this.state.users;
        let uuid = this.pubnub.getUUID();

        users.delete(uuid);
        this.setState({
          users,
        });
        this.pubnub.publish({
          message: {
            hideUser: true
          },
          channel: "global"
        });
      }
    
  }

  clearMessage = uuid => {
    let users = this.state.users;
    let user = users.get(uuid)
    delete user.message;
    users.set(uuid,user);
    this.setState(
    {
      users,
    });
  };


  isEquivalent = (a, b) => {
    if (!a || !b) {
      if (a === b) return true;
      return false;
    }
    // Create arrays of property names
    var aProps = Object.getOwnPropertyNames(a);
    var bProps = Object.getOwnPropertyNames(b);

    // If number of properties is different,
    // objects are not equivalent
    if (aProps.length != bProps.length) {
      return false;
    }

    for (var i = 0; i < aProps.length; i++) {
      var propName = aProps[i];

      // If values of same property are not equal,
      // objects are not equivalent
      if (a[propName] !== b[propName]) {
        return false;
      }
    }

    // If we made it this far, objects
    // are considered equivalent
    return true;
  };


  animateToCurrent = (coords, speed) => {
    region = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01
    };
    this.map.animateToRegion(region, speed);
  };


  render() {

    let usersArray = Array.from(this.state.users.values());
    return (

      <View style={styles.container}  >
          <MapView
            style={styles.map}
            ref={ref => (this.map = ref)}
            onMoveShouldSetResponder={this.draggedMap}
            initialRegion={{
              latitude: 36.81808,
              longitude: -98.640297,
              latitudeDelta: 60.0001,
              longitudeDelta: 60.0001
            }}
          >
            {usersArray.map((item) => (
              <Marker
                style={styles.marker}
                key={item.uuid}
                coordinate={{
                  latitude: item.latitude,
                  longitude: item.longitude
                }}
                ref={marker => {
                  this.marker = marker;
                }}
              >
              </Marker>
            ))}
          </MapView>
      </View>
      

    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  marker: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: Platform.OS === "android" ? 100 : 0,
  },
  map: {
    ...StyleSheet.absoluteFillObject
  },
});

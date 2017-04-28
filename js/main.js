window.currentChannelName; //Global variable for the current channel that your player character is on
window.currentFireChannelName; //Global variable that checks the current stage you are on to send the correct information to the PubNub Block
window.globalCurrentLevel = 0; //Global variable for the current level (index starts at 0)
window.UniqueID = PubNub.generateUUID(); //Generate a unique id for the player. Generated by the PubNub Network
window.globalLevelState = null; //Sets the globalLevelState to null if you aren't connected to the network. Once connected, the level will generate to the info that was on the block.
console.log('UniqueID', UniqueID); // Print out your clientsr Unique ID
window.text1 =  "Level 1 Occupancy: "  + "0"; //Global text objects for occupancy count
window.text2 =  "Level 2 Occupancy: "  + "0";
window.text3 =  "Level 3 Occupancy: "  + "0";
var textResponse1;
var textResponse2;
var textResponse3;
var updateOccupancyCounter = false; //Occupancy Counter variable to check if the timer has already been called in that scene
window.keyMessages = [];

window.handleKeyMessages = function() {
    window.keyMessages.forEach((messageEvent)=> {
        if(window.globalOtherHeros) { //If player exists
            if(messageEvent.channel === window.currentChannelName) { //If the messages channel is equal to your current channel
                if(!window.globalOtherHeros.has(messageEvent.message.uuid)) { //If the message isn't equal to your uuid
                    window.globalGameState._addOtherCharacter(messageEvent.message.uuid); // Add another player to the game that is not yourself
                    sendKeyMessage({}); //Send publish to all clients about user information
                }
                if(messageEvent.message.position && window.globalOtherHeros.has(messageEvent.message.uuid)) { //If the message contains the position of the player and the player has a uuid that matches with one in the level
                    window.keyMessages.push(messageEvent);
                    var otherplayer = window.globalOtherHeros.get(messageEvent.message.uuid);
                    //otherplayer.position.set(messageEvent.message.position.x, messageEvent.message.position.y); // set the position of each player according to x y
                    //if(otherplayer.position.y >525){ //If the physics pushes a player through the ground, and a message is receieved at a y less than 525, adjust the players position
                    //    console.log("glitch")
                    //    otherplayer.position.set(otherplayer.position.x, otherplayer.position + 75)
                    //}
                    if(messageEvent.message.keyMessage.up === 'down') { //If message equals arrow up, make the player jump with the correct UUID
                        otherplayer.jump();
                        otherplayer.jumpStart = Date.now();
                    }	else if(messageEvent.message.keyMessage.up === 'up') {
                        otherplayer.jumpStart = 0;
                    }
                    if(messageEvent.message.keyMessage.left === 'down') { //If message equals arrow left, make the player move left with the correct UUID
                        otherplayer.goingLeft = true;
                    }	else if(messageEvent.message.keyMessage.left === 'up') {
                        otherplayer.goingLeft = false;
                    }
                    if(messageEvent.message.keyMessage.right === 'down') { //If message equals arrow down, make the player move right with the correct UUID
                        otherplayer.goingRight = true;
                    }   else if(messageEvent.message.keyMessage.right === 'up') {
                        otherplayer.goingRight = false;
                    }
                }
            }
        }
    })
    window.keyMessages.length = 0;
}

window.createMyPubNub = function(currentLevel) {
    console.log('createMyPubNub', currentLevel);
    window.globalCurrentLevel = currentLevel; //Get the current level and set it to the global level
    window.currentFireChannelName = 'realtimephaserFire2'; 
	window.currentChannelName = 'realtimephaser' + currentLevel; //Create the channel name + the current level. This way each level is on its own channel.
    var checkIfJoined = false; //If player has joined the channel

    //Setup your PubNub Keys
    window.pubnub = new PubNub({
        publishKey : 'pub-c-1c688f67-2435-4622-96e3-d30dfd9d0b37',
        subscribeKey : 'sub-c-e4c02264-1e13-11e7-894d-0619f8945a4f',
        uuid: UniqueID,
    });

    //Subscribe to the two PubNub Channels
    pubnub.subscribe({
        channels : [window.currentChannelName, window.currentFireChannelName],
        withPresence: true,
    });


    //Create PubNub Listener for message events
    window.listener = {
        status(statusEvent) {
            //Send fire event to connect to the block
            var requestIntMsg = {requestInt: true, currentLevel: window.globalCurrentLevel, uuid: UniqueID};
            pubnub.fire({
                message: requestIntMsg,
                channel: window.currentFireChannelName,
                sendByPost: false
            });
        },
        message(messageEvent) {
        	if(messageEvent.message.uuid === UniqueID) {
        	    return; //this blocks drawing a new character set by the server for ourselve, to lower latency
        	}
            if(messageEvent.channel === window.currentFireChannelName) { 
                window.globalLastTime = messageEvent.timetoken; //Set the timestamp for when you send fire messages to the block
                if(messageEvent.message.int === true && messageEvent.message.sendToRightPlayer === UniqueID) { //If you get a message and it matches with your UUID
                    window.globalLevelState = messageEvent.message.value; //Set the globalLevelState to the information set on the block
                    window.StartLoading(); //Call the game state start function in onLoad
                }
            }

            if(window.globalOtherHeros) { //If player exists
                if(messageEvent.channel === window.currentChannelName) { //If the messages channel is equal to your current channel
                    if(!window.globalOtherHeros.has(messageEvent.message.uuid)) { //If the message isn't equal to your uuid
                        window.globalGameState._addOtherCharacter(messageEvent.message.uuid); // Add another player to the game that is not yourself
                        sendKeyMessage({}); //Send publish to all clients about user information
                    }
                    if(messageEvent.message.position && window.globalOtherHeros.has(messageEvent.message.uuid)) { //If the message contains the position of the player and the player has a uuid that matches with one in the level
                        window.keyMessages.push(messageEvent);
                    }
                }
            }
        },
        presence(presenceEvent, data) { //PubNub on presence message / event 
            function checkFlag(){ // Function that reruns until response
                if(window.globalOtherHeros && checkIfJoined === true){ //If the globalother heros exists and if the player joined equals true
                    clearInterval(occupancyCounter); //Destroy the timer for that scene
                    updateOccupancyCounter = true //Update the variable that stops the timer from running
                    
                    //Run PubNub HereNow function that controls the occupancy
                    pubnub.hereNow(
                        {
                            includeUUIDs: true,
                            includeState: true
                        },
                        function (status, response) {
                            //If I get a valid response from the channel change the text objects to the correct occupancy count
                            if(typeof(response.channels.realtimephaser0) !== 'undefined'){
                                textResponse1 = response.channels.realtimephaser0.occupancy.toString();
                            }else{  
                                textResponse1 = "0";
                            }
                            if(typeof(response.channels.realtimephaser1) !== 'undefined'){
                                textResponse2 = response.channels.realtimephaser1.occupancy.toString();
                            }else{
                                textResponse2 = "0";
                            }
                            if(typeof(response.channels.realtimephaser2) !== 'undefined'){
                                textResponse3 = response.channels.realtimephaser2.occupancy.toString();
                            }else{
                                textResponse3 = "0";
                            }
                            window.text1 =  "Level 1 Occupancy: " + textResponse1;
                            window.text2 =  "Level 2 Occupancy: " + textResponse2;
                            window.text3 =  "Level 3 Occupancy: " + textResponse3;
                            window.textObject1.setText(window.text1)
                            window.textObject2.setText(window.text2)
                            window.textObject3.setText(window.text3)
                        }
                    );
                }
            }
            if(updateOccupancyCounter === false){
                var occupancyCounter = setInterval(checkFlag, 200); //Start timer to run the checkflag function above
            }
            if(presenceEvent.action === 'join') //If we recieve a presence event that says a player joined the channel from the pubnub servers
            {
                checkIfJoined = true
                checkFlag();
                //text = presenceEvent.totalOccupancy.toString()
                if(presenceEvent.uuid != UniqueID){
                    sendKeyMessage({}); //Send message of players location on screen
                } else { // My uuid joined
                    if(presenceEvent.channel === window.currentFireChannelName) {
                    }                
                }
            }
            else if(presenceEvent.action === 'leave' || presenceEvent.action === 'timeout') 
            {
                checkFlag();
                try {
    	           window.globalGameState._removeOtherCharacter(presenceEvent.uuid); // Remove character on leave events if the individual exists
                } catch(err) {
                    //console.log(err)
                }
            }
        }

    }
    //If person leaves or refreshes the window, run the unsubscribe function
    window.onbeforeunload = function(e) {
        window.globalUnsubscribe();
    };
    //Unsubscribe people from PubNub network
    window.globalUnsubscribe = function(uuid) {
    	try {
            console.log('unsubscribing', window.currentChannelName);
            pubnub.unsubscribe({
                channels: [window.currentChannelName, window.currentFireChannelName],
                withPresence: true
            });
            pubnub.removeListener(listener);
    	} catch(err) {
    		console.log("Failed to UnSub");
    	}
    }
    pubnub.addListener(listener);
}

function sendKeyMessage(keyMessage) {
    if(window.globalMyHero){
        pubnub.publish(
        {
            message: { 
                uuid: UniqueID,
    			keyMessage: keyMessage,
    			position: window.globalMyHero.position,
                keyCollected: keyCollected
            },
            channel: window.currentChannelName,
            sendByPost: false, // true to send via posts
        });		
        //console.log("send message!")
    }else{
        console.log("Player doesn't exsist so don't set position")
    }
}

function fireCoins() {
   var message = { 
            uuid: UniqueID,
            coinCache: window.globalLevelState.coinCache,
            currentLevel: window.globalCurrentLevel,
            time: window.globalLastTime
        };
    console.log('fireCoins', message);
    pubnub.fire(
    {
        message: message,
        
        channel: window.currentFireChannelName,
        sendByPost: false, // true to send via posts
    });
}

//Load External Javascript files
var loadHeroScript = document.createElement('script');
loadHeroScript.src = './js/heroScript.js';
document.head.appendChild(loadHeroScript);

var loadLoadingState = document.createElement('script');
loadLoadingState.src = './js/loadingState.js';
document.head.appendChild(loadLoadingState);

var loadPlaystate = document.createElement('script');
loadPlaystate.src = './js/playState.js';
document.head.appendChild(loadPlaystate);

// =============================================================================
// Load the various phaser states and start game
// =============================================================================

window.onload = function () {
    let game = new Phaser.Game(960, 600, Phaser.AUTO, 'game');
    game.state.disableVisibilityChange = true; //This allows two windows to be open at the same time and allow both windows to run the update function
    game.currentRenderOrderID;
    game.state.add('play', PlayState);
    game.state.add('loading', LoadingState);
	window.createMyPubNub(0); //Connect to the pubnub network and run level code 0
    window.StartLoading = function() {
        game.state.start('loading'); //Run the loading function once you successfully connect to the pubnub network
    }
};
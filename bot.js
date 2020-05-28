var Discord = require('discord.io');
var auth = require('../auth.json');
var OAuth = require('oauth');
var twitterSecrets = require('../oauthKeys.json');
var twitterDict = require('./twitterFeeds.json');
var fs = require('fs');

var timeToCheckNextTweet;
var lastTweet = "";

function checkIfUpdateTweet(screenName){
	var data = fs.readFileSync('./DiscordTwitterBot/twitterFeeds.json');
	var obj = JSON.parse(data);
	
	var feedExists = false;
	for (var key in obj.feeds) {
		if (obj.feeds[key].screen_name === screenName) {
			var lastChecked = new Date(obj.feeds[key].last_checked);
			//checks if updated within the last minute. To avoid rate limiting, pull once per minute
			if(new Date(lastChecked.getTime() + 60000) <= new Date()) {
				updateTweets(screenName);
			}
			
			break;
		}
	}
}

function updateTweets(screenName) {
	
	var oauth = new OAuth.OAuth(
		'https://api.twitter.com/oauth/request_token',
		'https://api.twitter.com/oauth/access_token',
		twitterSecrets.consumer_key,
		twitterSecrets.consumer_secret,
		'1.0A',
		null,
		'HMAC-SHA1'
	);
	
	oauth.get(
		'https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name='+ screenName + '&count=1',
		twitterSecrets.token, //test user token
		twitterSecrets.token_secret, //test user secret            
		function (e, data, res){
			if (e) console.error(e);
			var response = JSON.parse(data);
			lastTweet = 'https://twitter.com/' + screenName + '/status/' + response[0].id_str;
			
			var data = fs.readFileSync('./DiscordTwitterBot/twitterFeeds.json');
			var obj = JSON.parse(data);
			obj.feeds.push({
				screen_name: screenName,
				last_tweet: lastTweet,
				last_checked: (new Date()).toString()
			});
			json = JSON.stringify(obj);
			fs.writeFile('./DiscordTwitterBot/twitterFeeds.json', json, 'utf8', function(err, data){
				if (err) console.error(err);
			});
		}
	);
}

function getLastTweet(screenName, channelID) {
	var data = fs.readFileSync('./DiscordTwitterBot/twitterFeeds.json');
	var tweet = '';

	var obj = JSON.parse(data);
	var feedExists = false;
	for (var key in obj.feeds) {
		if (obj.feeds[key].screen_name === screenName) {
			bot.sendMessage({
				to: channelID,
				message: obj.feeds[key].last_tweet
			});
		}
	}
}

var intervalFunc = function() {
	var data = fs.readFileSync('./DiscordTwitterBot/twitterFeeds.json');

	var obj = JSON.parse(data);
	for (var key in obj.feeds) {
		var tweet = obj.feeds[key].last_tweet;
		checkIfUpdateTweet(obj.feeds[key].screen_name);
		var data2 = fs.readFileSync('./DiscordTwitterBot/twitterFeeds.json');
		var obj2 = JSON.parse(data);
		loop : for (var key2 in obj2.feeds) {
			if (obj.feeds[key].screen_name === obj2.feeds[key2].screen_name) {
				if (tweet !== obj2.feeds[key2].last_tweet) {
					getLastTweet(obj.feeds[key].screen_name, '426019751337263114');
				}
				break loop;
			}
		}
	}
}

var bot = new Discord.Client({
	token: auth.token,
	autorun: true
});
bot.on('ready', function (evt) {
	var interval = setInterval(intervalFunc, 300000);
	//channelId = 426019751337263114
});
bot.on('message', function (user, userID, channelID, message, evt) {
	if (message.substring(0, 2) == '**') {
		var args = message.substring(2).split(' ');
		var cmd = args[0];
		
		args = args[1];
		switch(cmd) {
			case 'status': 
				//precondition: needs a twitter handle
				if (args === '') {
					bot.sendMessage({
						to: channelID,
						message: 'Please use a valid twitter handle'
					});
				}
				else {
					checkIfUpdateTweet(false, args);
					getLastTweet(args, channelID);
				}
			break;
			case 'register':
				//precondition: needs a twitter handle
				if (args === ''){
					bot.sendMessage({
						to: channelID,
						message: 'please enter a valid twitter handle'
					});
				}
				else {
					fs.readFileSync('./DiscordTwitterBot/twitterFeeds.json', 'utf8', function(err, data){
						if (err) {
							console.error(err);
						} 
						else {
							obj = JSON.parse(data);
							var feedExists = false;
							for (var key in obj.feeds) {
								if (obj.feeds[key].screen_name === args) {
									feedExists = true;
									break;
								}
							}
							
							if (feedExists) {
								bot.sendMessage({
									to: channelID,
									message: 'Twitter handle is already registered'
								});
							}
							else {
								updateTweets(args);

								bot.sendMessage({
									to: channelID,
									message: '`' + args + '` twitter handle registered'
								});
							}
						}
					});	
				}
			break;
			case 'feeds':
				fs.readFileSync('./DiscordTwitterBot/twitterFeeds.json', 'utf8', function(err, data){
					if (err) {
						console.error(err);
					} 
					else {
						obj = JSON.parse(data);
						var output = '';
						for (var key in obj.feeds) {
							output += '`' + obj.feeds[key].screen_name + '` ';
						}
						
						bot.sendMessage({
							to: channelID,
							message: output
						});
					}
				});
			break;	
			case 'tony':
				if(user === 'BlessedDeathGaming') {
					bot.sendMessage({
						to: userID,
						message: 'Kill yourself'
					});
				}
				bot.sendMessage({
					to: channelID,
					message: 'fuck tony'
				});
			break;
			case 'help':
				bot.sendMessage({
					to: channelID,
					message: 'Commands: `status [twitter handle]` `register [twitter handle]` `feeds` `tony`. When entering a twitter handle, do **NOT** use the `@` symbol'
				});
			break;
			case 'debug':
				intervalFunc();
				console.log(user);
				console.log(userID);
				console.log(channelID);
				console.log(message);
				console.log(evt);
			break;
			default:
				bot.sendMessage({
					to: channelID,
					message: 'unknown command. Known commands: `status [twitter handle]` `register [twitter handle]` `feeds` `tony`'
				});
			break;
		}
	}
});
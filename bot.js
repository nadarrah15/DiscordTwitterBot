var Discord = require('discord.io');
var auth = require('../auth.json');
var OAuth = require('oauth');
var twitterSecrets = require('../oauthKeys.json');
var twitterDict = require('./twitterFeeds.json');
var fs = require('fs');

var timeToCheckNextTweet;
var lastTweet = "";

function checkIfUpdateTweet(screenName){
	for (feed in twitterDict.feeds) {
		if (feed.screen_name === screenName) {
			var lastChecked = new Date(feed.last_checked);
			//checks if updated within the last minute. To avoid rate limiting, pull once per minute
			if(new Date(lastChecked.getTime() + 60000) <= new Date()) {
				updateTweets(screenName);
			}
			else {
				lastTweet = feed.last_tweet;
			}
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
			
			fs.readFile('./DiscordTwitterBot/twitterFeeds.json', 'utf8', function(err, data){
				if (err) {
					console.error(err);
				} 
				else {
					obj = JSON.parse(data);
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
			});
			
			twitterDict = require('./twitterFeeds');
		}
	);
}

var bot = new Discord.Client({
	token: auth.token,
	autorun: true
});
bot.on('ready', function (evt) {
	timeToCheckNextTweet = new Date();
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
					bot.sendMessage({
						to: channelID,
						message: lastTweet
					});
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
					fs.readFile('./DiscordTwitterBot/twitterFeeds.json', 'utf8', function(err, data){
						if (err) {
							console.error(err);
						} 
						else {
							obj = JSON.parse(data);
							var feedExists = false;
							for (feed in obj.feeds) {
								if(feed.screen_name = args) {
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
				fs.readFile('./DiscordTwitterBot/twitterFeeds.json', 'utf8', function(err, data){
					if (err) {
						console.error(err);
					} 
					else {
						obj = JSON.parse(data);
						var output = "";
						for (feed in obj.feeds) {
							output += '`' + feed.screen_name + '` ';
						}
						
						bot.sendMessage({
							to: channelID,
							message: output
						});
					}
				});
				var data = JSON.parse(twitterDict);
				var output = "";
				for (feed in data.feeds) {
					output += '`' + feed.screen_name + '` ';
				}
				
				bot.sendMessage({
					to: channelID,
					message: output
				});
			break;	
			case 'tony':
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
			default:
				bot.sendMessage({
					to: channelID,
					message: 'unknown command. Known commands: `status [twitter handle]` `register [twitter handle]` `feeds` `tony`'
				});
			break;
		}
	}
});
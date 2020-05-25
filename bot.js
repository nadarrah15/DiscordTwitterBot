var Discord = require('discord.io');
var auth = require('./auth.json');
var OAuth = require('oauth');
var twitterSecrets = require('./oauthKeys.json');

var timeToCheckNextTweet;
var tweetID;
var lastTweet = "";

function checkIfUpdateTweet(firstTimeRun){
	if (firstTimeRun || new Date(timeToCheckNextTweet.getTime() + 60000) <= new Date()) {
		updateTweets();
	}
}

function updateTweets() {
	
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
		'https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name=DOTA2&count=1',
		twitterSecrets.token, //test user token
		twitterSecrets.token_secret, //test user secret            
		function (e, data, res){
			var response = JSON.parse(data);
			lastTweet = 'https://twitter.com/DOTA2/status/' + response[0].id_str;
		}
	);
}

var bot = new Discord.Client({
	token: auth.token,
	autorun: true
});
bot.on('ready', function (evt) {
	timeToCheckNextTweet = new Date();
	updateTweets(true);
});
bot.on('message', function (user, userID, channelID, message, evt) {
	if (message.substring(0, 2) == '**') {
		var args = message.substring(2).split(' ');
		var cmd = args[0];
		
		args = args.splice(1);
		switch(cmd) {
			case 'status': 
				updateTweets(false);
				bot.sendMessage({
					to: channelID,
					message: lastTweet
				});
			break;
			case 'tony':
				bot.sendMessage({
					to: channelID,
					message: 'fuck tony'
				});
			break;
			default:
				bot.sendMessage({
					to: channelID,
					message: 'unknown command. Known commands: status'
				});
			break;
		}
	}
});
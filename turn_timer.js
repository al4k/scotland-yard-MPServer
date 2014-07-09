"use strict";
var events = require('events');
var util = require('util');

var time_spent = 0.0;
var interval = 100;
var timer = null;
var end_turn_callback;

// constructor
function TurnTimer(time_limit, callback)
{
	this.time_limit = time_limit;
	end_turn_callback = callback;
}
util.inherits(TurnTimer, events.EventEmitter);



// function to start the time
TurnTimer.prototype.start = function(limit)
{
	this.time_limit = limit;
	time_spent = this.time_limit;
	timer = setInterval(this.update, interval);
}

TurnTimer.prototype.update = function()
{
	time_spent -= interval;

	if(time_spent <= 0.0)
	{
		console.log("[Message]: Turn Over!!!");
		clearInterval(timer);
		timer = null;
		time_spent = 0.0;
		end_turn_callback();
	}
}

TurnTimer.prototype.stop = function()
{
	if(timer == null)
		return;

	console.log("[Message]: Turn Taken!!!");
	clearInterval(timer);
	timer = null;
	time_spent = 0.0;
}

TurnTimer.prototype.getTimeLeft = function()
{
	return time_spent;
}


module.exports = TurnTimer;

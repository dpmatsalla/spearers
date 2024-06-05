// convert date & time in Brisbane timezone UTC+10
function formatDay(t) {
	const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	const date = new Date(t);
	const formatter = new Intl.DateTimeFormat('en-US', {
			timeZone: 'Australia/Brisbane',
			weekday: 'short',
			month: 'short',
			day: 'numeric',
		  }
	);
	return formatter.format(date).replace(',','');
}

// determine tide at a given timestamp - incoming/outoing
function tideText(t) {
	const t0 = tideHeight(t - 0.75*3600*1000);  //at t-45mins i.e. 4:15am
	const t1 = tideHeight(t + 0.5*3600*1000);   //at t+30mins i.e. 5:30am
	const t2 = tideHeight(t + 1.75*3600*1000);  //at t+75mins i.e. 6:45am
	let text = t1.toFixed(1) + ' m ';

	if (t1 > t0) {
		if (t2 > t1) {text += 'incoming';}
		else {text += '↑ neutral';}
	} else {
		if (t2 < t1) {text += 'outgoing';}
		else {text += '↓ neutral';}
	}
	return text;
}

// Adjust tides for river current and add timestamp
function adjustTides() {
	for (var i=0; i < tide_list.length; i++) {
		const tideTime = Date.parse(tide_list[i].time_local); // + adjust*3600*1000; 
		tide_list[i].timestamp = tideTime;
		tide_list[i].time_local = new Date(tideTime).toISOString();
	}
}

// return height for a timestamp
function tideHeight(t) {
	let i = tide_list.findIndex(tide => tide.timestamp >= t);
	if (i === 0) return parseFloat(tide_list[0].height);
	const { timestamp: t0, height: h0 } = tide_list[i - 1];
	const { timestamp: t1, height: h1 } = tide_list[i];
	const height0 = parseFloat(h0);
	const height1 = parseFloat(h1);
	return (height0 - height1) / 2 * Math.cos(Math.PI * (t0 - t) / (t0 - t1)) + (height0 + height1) / 2;
}

//find where 5am is in the forecast array.  If outside array, then returns 0
function item(t) {
	let i5am = forecast.hourly.time.findIndex(time => new Date(time).getTime() >= t);
	return i5am === -1 ? 0 : i5am;
}

function drawCurve(coords, amBox) {
	const canvas = document.getElementById('myCanvas');
	const ctx = canvas.getContext('2d');
	const xx = canvas.width;
	const yy = canvas.height - 25; //the y=0 line
//	const ymax = 3;		// the maximum tide height rounded up *(calculate this as a function of Math.max(high tide height)
	const ymax = Math.ceil(Math.max(tide_list[0].height,tide_list[1].height,tide_list[2].height,tide_list[3].height) + 0.3);
	const amp = (yy - yy/4)/ymax; 	// the height of y=1.  Height of header is yy/4 for now (unless we need to fixate it)

	const day = 24*3600*1000;
	const now = Date.now();
	const timeStart = now - 7*day;  //1 week ago
	const days = 20;
	const duration = days*day;
	const timeEnd = timeStart + duration;

	// calc next midnight & noon & 5am
	let nextTime = new Date(timeStart);
	nextTime.setUTCHours(14, 0, 0, 0);  //2pm UTC = midnight Brisbane (next day)
	const midnight = nextTime.getTime();
	nextTime = new Date(timeStart);
	nextTime.setUTCHours(2,0,0,0);   //2am UTC = noon Brisbane
	let noon = nextTime.getTime();
	if (noon <= timeStart) noon += day;
	nextTime = new Date(timeStart);
	nextTime.setUTCHours(19,0,0,0);   //7pm UTC = 5am Brisbane
	let next5am = nextTime.getTime();
	if (next5am <= timeStart) next5am += day;

	ctx.clearRect(0, 0, xx, yy);   //clear canvas

	//calc first sunrise and sunset
	nextTime.setDate(nextTime.getDate() - 1);
	var times = SunCalc.getTimes(nextTime, ...coords);
	var sunset1 = times.sunset;  //previous sunset
	var sunsettime1 = sunset1.getTime();

	for (var i=0; i<=days; i++) {
		nextTime.setDate(nextTime.getDate() + 1);
		
		//calculate & draw current sunrise and next sunset
		times = SunCalc.getTimes(nextTime, ...coords);
		const sunrise = times.sunrise;
		const sunrisetime = sunrise.getTime();
		const sunset2 = times.sunset;
		const sunsettime2 = sunset2.getTime();
		ctx.fillStyle = "#BBBBBB"; //draw night period
		ctx.fillRect((sunsettime1 - timeStart)*xx/duration, 0, (sunrisetime - sunsettime1)*xx/duration, canvas.height);
		ctx.fillStyle = "#FFFFFF"; //draw day period
		ctx.fillRect((sunrisetime - timeStart)*xx/duration, 0, (sunsettime2 - sunrisetime)*xx/duration, canvas.height);

		//write sunrise time
		var sunriseFormat = sunrise.toLocaleTimeString('en-US', { timeZone: 'Australia/Brisbane', hour: 'numeric', minute: 'numeric', hour12: false });
		var sunsetFormat = sunset1.toLocaleTimeString('en-US', { timeZone: 'Australia/Brisbane', hour: 'numeric', minute: 'numeric', hour12: false });
		ctx.font = "14px Arial";
		ctx.textAlign = "center";
		ctx.fillStyle = 'darkcyan'; //brown
		ctx.fillText(sunriseFormat, (sunrisetime - timeStart)*xx/duration, yy + 15);
		ctx.fillText(sunsetFormat, (sunsettime1 - timeStart)*xx/duration, yy + 15);

		if (amBox) {
			// draw 5-6am paddling boxes
			const sunriseHr = Number(new Date(sunrisetime).toLocaleString('en-US', {
				timeZone: 'Australia/Brisbane',
				hour: '2-digit',
				hour12: false, // Set to 24-hour
			}));

			// night paddle (darkish cyan), daylight (yellowish), dawn/sunrise (purplish)
			ctx.fillStyle = sunriseHr >= 6 ? "#00CCCC" : sunriseHr < 5 ? "#FFFFd0" : "#DDDFFF";

			let t = next5am + (i-1)*day; //start at 5am
			let x = (t - timeStart)*xx/duration
			let y = yy - tideHeight(t)*amp;
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, y);
			t += 1*3600*1000;		   //add an hour to bring it to 6am
			x = (t - timeStart)*xx/duration
			y = yy - tideHeight(t)*amp;
			ctx.lineTo(x, y);
			ctx.lineTo(x, 0);
			ctx.closePath();
			ctx.fill();
			ctx.fillRect((t - 3*3600*1000 - timeStart)*xx/duration, 2, (5*3600*1000)*xx/duration, yy - 3*amp - 10);
			ctx.fillRect((t - 4*3600*1000 - timeStart)*xx/duration, yy - 3*amp, (7*3600*1000)*xx/duration, 38);
		}
		sunsettime1 = sunsettime2;
		sunset1 = sunset2;
	}

	// draw horizontal lines 
	ctx.beginPath();
	ctx.strokeStyle = 'grey';
	ctx.lineWidth = 1;
	for (i=0; i<=ymax; i++) {
		ctx.moveTo(0, yy - i*amp);
		ctx.lineTo(xx, yy - i*amp);
		ctx.stroke();
	}

	// draw scale of tide heights on left of graph
	ctx.font = "18px Arial";
	ctx.textAlign = "left";
	ctx.fillStyle = 'gray';
	for (i=0; i<=ymax; i++) {
		ctx.fillText(i+" m", 5, yy - i*amp +15);
	}

	for (i=0; i<days; i++) {
		// draw midnight ticks
		ctx.beginPath();
		ctx.strokeStyle = 'darkcyan';
		ctx.lineWidth = 2;
		let x = (midnight + i*day - timeStart)*xx/duration;
		ctx.moveTo(x, yy - ymax*amp);
		ctx.lineTo(x, yy - ymax*amp + 15);
		ctx.stroke();
		ctx.moveTo(x, yy);
		ctx.lineTo(x, yy - 15);
		ctx.stroke();
		ctx.lineWidth = 0.5;

		// draw noon ticks 
		x = (noon + i*day - timeStart)*xx/duration;
		ctx.moveTo(x, yy - ymax*amp);  
		ctx.lineTo(x, yy - ymax*amp + 15);
		ctx.stroke();
		ctx.moveTo(x, yy);  
		ctx.lineTo(x, yy - 15);
		ctx.stroke();
	
		// write text for hours
		ctx.font = "14px Arial";
		ctx.textAlign = "center";
		ctx.fillStyle = 'darkcyan';
		ctx.fillText("00:00", (midnight + i*day - timeStart)*xx/duration, yy + 15);
		ctx.fillText("12:00", (noon + i*day - timeStart)*xx/duration, yy + 15);

		// write text for date and tide station
		ctx.font = "bold 22px Arial";
		ctx.textAlign = "center";
		ctx.fillText(formatDay(noon + i*day), (noon + i*day - timeStart)*xx/duration, 20); 
		ctx.font = "16px Arial";
		ctx.fillText(loc, (midnight + i*day - timeStart)*xx/duration, 20); 

		if (amBox) {
			// write text 5-6am in box
			const t = next5am + i*day;
			x = (t + 0.5*3600*1000 - timeStart)*xx/duration;
			const tide = tideText(t); //calc tideText for 5-6am paddle that day
			
			ctx.font = 'bold 14px Arial';
			ctx.textAlign = 'center';
			ctx.fillStyle = 'black';
			ctx.fillText('5-6am', x, 15);
			
			// write text for weather info for paddling period - either black or blue (if goodday)
			ctx.fillStyle = tide.includes('incoming') && parseFloat(tide.substr(0,3)) >= 1.7 ? 'blue' : 'black';
			ctx.fillText(tide, x, yy - 3*amp + 15);

			// write text height change in mm/hr
			if (!tide.includes('neutral')) {
				var spd = Math.round((tideHeight(t + 1*3600*1000) - tideHeight(t))*100)*10;
				if (spd > 0) { spd = '+' + spd; }
				if (Math.abs(spd) > 400) { ctx.font = 'bold 14px Arial'; ctx.fillStyle = 'blue'; } 
					else { ctx.font = '14px Arial'; ctx.fillStyle = 'black'; }
				ctx.fillText(spd + ' mm/hr', x, yy - 3*amp + 32);
			}

			// if we have weather forecast data for the day, then write out the weather forecast
			if (meteo) {
				let i5am = item(next5am + i*day);
				if (i5am > 0) {
					ctx.textAlign = "center";

					//write text for temperature 
					let data = Math.round(forecast.hourly.temperature_2m[i5am]);
					if (data < 10) { ctx.font = 'bold 14px Arial'; ctx.fillStyle = 'blue'; } 
						else if (data > 23) { ctx.font = 'bold 14px Arial'; ctx.fillStyle = 'red'; } 
						else { ctx.font = '14px Arial'; ctx.fillStyle = 'black'; }
					ctx.fillText('Temp ' + data + '°C', x, 33);

					//write text for wind
					data = Math.round(forecast.hourly.wind_speed_10m[i5am]);
					if (data > 9) { ctx.font = 'bold 14px Arial'; ctx.fillStyle = 'red'; } 
						else { ctx.font = '14px Arial'; ctx.fillStyle = 'black'; }
					ctx.fillText('Wind ' + data + ' kph', x, 50);

					//write text for rain probability
					data = Math.round(forecast.hourly.precipitation_probability[i5am]);
					if (data > 60) { ctx.font = 'bold 14px Arial'; ctx.fillStyle = 'red'; } 
						else { ctx.font = '14px Arial'; ctx.fillStyle = 'black'; }
					ctx.fillText('Rain ' + data + '%', x, 67);
				}
			}
		}
	}
	
	// draw text of high and low tides on graph 
	let startIndex = tide_list.findIndex(tide => tide.timestamp >= timeStart);
	let endIndex = tide_list.findIndex(tide => tide.timestamp >= timeStart + day * days);

	// If endIndex is not found, set it to the length of tide_list
	endIndex = endIndex === -1 ? tide_list.length : endIndex;

	ctx.font = '14px Arial';
	ctx.textAlign = "center";

	// Draw text for tide time and height
	for (let k = startIndex; k < endIndex; k++) {
		
		//draw text for tide time and height
		let t = tide_list[k].timestamp;
		let h = parseFloat(tide_list[k].height);
		let x = (t - timeStart)*xx/duration;
		let y = yy - h*amp;
		let ttext = new Date(t).toLocaleTimeString('en-US', { timeZone: 'Australia/Brisbane', hour: 'numeric', minute: 'numeric', hour12: false });
		let htext = '— ' + h.toFixed(1) + ' m';
		ctx.fillStyle = 'darkcyan';
		ctx.fillText(ttext, x, y - 20);
		ctx.fillText('|', x, y - 6);
		ctx.textAlign = "left";
		ctx.fillStyle = 'black';
		ctx.fillText(htext, x + 9, y + 4);
	}
	//draw the tide height now
	let x = (now - timeStart)*xx/duration;
	let y = yy - tideHeight(now)*amp;
	let htext = tideHeight(now).toFixed(1) + ' m —';
	ctx.fillStyle = "#DDDDDD"; //rectangle
	ctx.fillRect(x - 57, y - 11, 57, 18);
	ctx.font = 'bold 14px Arial';
	ctx.textAlign = "right";
	ctx.fillStyle = 'darkred';
	ctx.fillText(htext, x, y + 4);

	//draw the tide height at selectTime
	x = selectTime*xx;
	let tt = selectTime*duration + timeStart;
	y = yy - tideHeight(tt)*amp;
	htext = tideHeight(tt).toFixed(1) + ' m —';
	ctx.fillStyle = "#DDDDDD"; //rectangle
	ctx.fillRect(x - 57, y - 11, 57, 18);
	ctx.fillStyle = 'darkred';
	ctx.fillText(htext, x, y + 4);

	// draw predicted tides, 15 min intervals 
	ctx.beginPath();
	for (let t = timeStart; t < timeEnd; t += 0.25*3600*1000) {
		x = (t - timeStart)*xx/duration
		y = yy - tideHeight(t)*amp;
		ctx.lineTo(x, y);
	}
	ctx.strokeStyle = '#000000';
	ctx.lineWidth = 3;
	ctx.stroke();

	// if we have riverheight data, then draw historical tides, 15 min intervals 
	if (river) {
		ctx.beginPath();
		riverData.forEach(([time, height]) => {
			x = (time * 1000 - timeStart) * xx / duration;
			y = yy - (parseFloat(height) + delta) * amp;
			ctx.lineTo(x, y);
		});
		ctx.strokeStyle = 'green';
		ctx.setLineDash([2, 1]);
		ctx.lineWidth = 4;
		ctx.stroke();
	}

	// Draw 'now' line and text
	x = (now - timeStart) * xx / duration;
	ctx.beginPath();
	ctx.moveTo(x, yy);
	ctx.lineTo(x, yy - ymax*amp);
	ctx.strokeStyle = (selectTime==0) ? 'red' : 'blue';
	ctx.setLineDash([]);
	ctx.lineWidth = 4;
	ctx.stroke();
	ctx.font = 'bold 14px Arial';
	ctx.textAlign = 'center';
	ctx.fillStyle = (selectTime==0) ? 'red' : 'blue';
	htext = new Date(now).toLocaleTimeString('en-US', { timeZone: 'Australia/Brisbane', hour: 'numeric', minute: 'numeric', hour12: false });
	ctx.fillText(htext, x, yy + 20);
	ctx.fillText('Now', x, yy - 3 * amp - 5);

	// Draw 'selectTime' line
	if (selectTime > 0) {
		x = selectTime*xx;
		ctx.beginPath();
		ctx.moveTo(x, yy);
		ctx.lineTo(x, yy - ymax*amp);
		ctx.strokeStyle = 'red';
		ctx.stroke();
		ctx.fillStyle = 'red';
		htext = new Date(tt).toLocaleTimeString('en-US', { timeZone: 'Australia/Brisbane', hour: 'numeric', minute: 'numeric', hour12: false });
		ctx.fillText(htext, x, yy + 20);
		tideHeightSpd = -Math.round((tideHeight(tt + 1*3600*1000) - tideHeight(tt))*100)*10;  // mm/hr
		ctx.fillText(-tideHeightSpd + ' mm/hr', x, yy - 3 * amp - 5);
	}
}
function avgAngle(a1,a2,l1,l2) {
	// Convert deg to rad
	let rad1 = a1 * (Math.PI / 180);
	let rad2 = a2 * (Math.PI / 180);
	// Vector sum of two angles
	let x = l1*Math.cos(rad1) + l2*Math.cos(rad2);
	let y = l1*Math.sin(rad1) + l2*Math.sin(rad2);
	// Calculate avg angle in rad
	let avgRad = Math.atan2(y, x);
	let avgL = Math.sqrt(x*x + y*y);
	// Convert to deg
	let avgDeg = avgRad * (180 / Math.PI);
	// Normalize the result 
	return [((avgDeg % 360) + 360) % 360, avgL];
}

// get the speed and direction of the current for a given latlng
function getSpd(point) {
	const { lat: x, lng: y } = point;
	let dir,spd,stn;
	let quads = [];
	let circles = -1, circleDir;

	ctxAreas.forEach((ctxArea, index) => {
		//is it inside some quads?
		let inside = false;
		for (let i = 0, j = ctxArea.vertices.length - 1; i < ctxArea.vertices.length; j = i++) {
			const xi = ctxArea.vertices[i].lat;
			const yi = ctxArea.vertices[i].lng;
			const xj = ctxArea.vertices[j].lat;
			const yj = ctxArea.vertices[j].lng;
			const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
			if (intersect) inside = !inside;
		}
		if (inside) quads.push(index);

		//is it inside a circle?
		const point1 = ctxArea.vertices[0]; 
		const point2 = ctxArea.vertices[1];
		const xi = (point1.lat + point2.lat)/2; 
		const yi = (point1.lng + point2.lng)/2;
		const leng = (point1.lat-xi)**2 + (point1.lng-yi)**2;
		if ((x-xi)**2 + (y-yi)**2 < leng) {
			circles = index;
			circleDir = calculateDistanceAndBearing(point, L.latLng(xi,yi)).bearing + 90;
			var diff = Math.abs(circleDir - ctxArea.dir);
			const normDiff = diff > 180 ? 360 - diff : diff;
			if (normDiff > 90) circleDir -= 180;	//add or subtract 90 degrees, whichever is acute angle with dir
		}
	});

	if (quads.length == 0) {
		if (circles > -1) {
			dir = circleDir;
			spd = ctxAreas[circles].v * tideHeightSpd/500;
			stn = ctxAreas[circles].stn;
		} else {
			dir = 0;
			spd = 0;
			stn = false;
		}
	} else if (quads.length == 1) {
		dir = ctxAreas[quads[0]].dir;
		spd = ctxAreas[quads[0]].v * tideHeightSpd/500;
		stn = ctxAreas[quads[0]].stn;
	} else {
		[dir,spd] = avgAngle(ctxAreas[quads[0]].dir, ctxAreas[quads[1]].dir, Number(ctxAreas[quads[0]].v), Number(ctxAreas[quads[1]].v));
		spd = Math.max(Number(ctxAreas[quads[0]].v), Number(ctxAreas[quads[1]].v)) * tideHeightSpd/500;
		stn = ctxAreas[quads[0]].stn;
	}
	return [dir,spd,stn];
}

//Function to get new flow object
function getFlow() {
	//loop through all of the quadrangles until we find a random point on the canvas that is in one of the quadrangles.  
	//If in multiple quadrangles, then the direction is averaged between the directions in both
	//Loop a max of 100 times, then abandon
	const maxIterations = 80;
	const bord = 0.001;
	let point,dir,spd = 0,stn;
	let j = 0;
	
	const bounds = map.getBounds();
	const southWest = bounds.getSouthWest();
	const northEast = bounds.getNorthEast();
	//const northWest = bounds.getNorthWest();
	//const southEast = bounds.getSouthEast();

	do {
		point = L.latLng(Math.random()*(northEast.lat+bord - (southWest.lat-bord)) + southWest.lat-bord, 
						 Math.random()*(northEast.lng+bord - (southWest.lng-bord)) + southWest.lng-bord);
		[dir,spd,stn] = getSpd(point);
		j++;
	} while (spd == 0 && j < maxIterations);		//if more than one quadrangle intersected, or if we've tried 80 times, then quit loop

	return [ point, dir, spd ];
}

// Function to initialize all flow objects
function initializeFlows() {
	flows = [];
	for (let i = 0; i < numFlows; i++) {

		const [ point, dir, spd ] = getFlow();
		
		// Create flow object if speed>0
		if (spd !== 0) {
			flows.push({
				point: point,
				dir: dir,
				spd: spd,
				progress: Math.random()*flowDuration // Progress of flow animation
			});
		}
	}
}

// Function to update flow positions based on wind direction and speed
function updateFlowPositions() {
	flows.forEach(flow => {
		const { point, dir, spd, progress } = flow;
		const speedIncrement = spd*flowFactor / 60; // Distance to move per frame (assuming 60 FPS)
		const progressIncrement = 1 / 60;			// time increment (assuming 60 FPS)

		// Update flow end position
		flow.point = computeDestinationPoint(point, speedIncrement, dir);

		// Increment progress of flow animation
		flow.progress += progressIncrement;

		// If flow has moved beyond double its length, reset position
		if (flow.progress >= flowDuration) {
			const [newPoint, newDir, newSpd] = getFlow();
			flow.point = newPoint;
			flow.dir = newDir;
			flow.spd = newSpd;
			flow.progress = 0;
		}
	});
}

// Function to draw all flows on the canvas
function drawFlows() {
	flows.forEach(flow => {
		const { point, dir, spd, progress } = flow;
		var angle = Math.max(Math.abs(spd)*15, 10);
		if (spd < 0) angle -= 180;
		if (spd !== 0) {
			const { x, y } = map.latLngToContainerPoint(point);
			
			// Draw the flow
			ctxm.beginPath();
			ctxm.arc(x, y, map.getZoom()/2, (dir - 90 - angle)*Math.PI/180, (dir - 90 + angle)*Math.PI/180);
			ctxm.lineWidth = 1;
			ctxm.strokeStyle = 'rgba(0,0,255,' + Math.sin((flowDuration-progress)/flowDuration*Math.PI) +')';
			ctxm.stroke();
		}
	});
}

function InitializeBarbs() {
	barbs = [];
	for (let i = 0; i < numBarbs; i++) {

		//getBarb
		let x = Math.random() * overlayCanvas.width + windSpdNow*barbLenFactor*Math.sin(windDirNow *Math.PI/180);
		let y = Math.random() * overlayCanvas.height - windSpdNow*barbLenFactor*Math.cos(windDirNow *Math.PI/180);

		// Create flow object
		barbs.push({
			x: x,
			y: y,
			progress: Math.random()*barbDuration // Progress of flow animation
		});
	}
}

// Function to update barb positions based on wind direction and speed
function updateBarbPositions() {
	barbs.forEach(barb => {
		const { x, y, progress } = barb;
		const speedIncrement = windSpdNow*barbSpdFactor / 60; // Distance to move per frame (assuming 60 FPS)
		const progressIncrement = 1 / 60;			// time increment (assuming 60 FPS)

		// Update barb end position
		const dx = -Math.sin(windDirNow*Math.PI/180) * speedIncrement;
		const dy = Math.cos(windDirNow*Math.PI/180) * speedIncrement;
		barb.x = x + dx;
		barb.y = y + dy;

		// Increment progress of barb animation
		barb.progress += progressIncrement;

		// If barb has moved beyond double its length, reset position
		if (barb.progress >= barbDuration) {
			//** call the function to calculate new line place
			let x = Math.random() * overlayCanvas.width + windSpdNow*barbLenFactor*Math.sin(windDirNow *Math.PI/180);
			let y = Math.random() * overlayCanvas.height - windSpdNow*barbLenFactor*Math.cos(windDirNow *Math.PI/180);
			
			barb.x = x;
			barb.y = y;
			barb.progress = 0;
		}
	});
}

// Function to draw all barbs on the canvas
function drawBarbs() {
	barbs.forEach(barb => {
		const { x, y, progress } = barb;
		var angle = Math.max(Math.abs(windSpdNow)*15, 20);
		if (windSpdNow < 0) angle -= 180;
		
		// Draw the barb
		ctxm.beginPath();
		ctxm.moveTo(x, y);
		ctxm.lineTo(x - windSpdNow*barbLenFactor*Math.sin(windDirNow *Math.PI/180) *Math.sin((barbDuration-progress)/barbDuration*Math.PI),
				   y + windSpdNow*barbLenFactor*Math.cos(windDirNow *Math.PI/180) *Math.sin((barbDuration-progress)/barbDuration*Math.PI));
		ctxm.lineWidth = 1;
		ctxm.strokeStyle = 'rgba(150,150,150,' + Math.sin((barbDuration-progress)/barbDuration*Math.PI) +')';
		ctxm.stroke();
	});
}

// Function to fetch data asynchronously from the PHP script using fetch, then update all the stuff the pieces of the page
function fetchWxData() {
	fetch(`fetchWxData.php?lat=${coords[0]}&lon=${coords[1]}`)
		.then(response => {
			if (!response.ok) {
				throw new Error('Network response was not ok ' + response.statusText);
			}
			return response.json();
		})
		.then(data => {
			forecast = JSON.parse(data);
			windDirNow = forecast.current.wind_direction_10m;
			windSpdNow = forecast.current.wind_speed_10m;
			tempNow = forecast.current.temperature_2m;
			precipNow = forecast.current.precipitation;
			document.getElementById('windDir').innerHTML = windDirNow;
			document.getElementById('windSpd').innerHTML = windSpdNow;
			document.getElementById('temp').innerHTML = tempNow;
			document.getElementById('precip').innerHTML = precipNow;
			meteo = true;
			
			//now redraw the tides canvas
			drawCurve(coords,true);
		})
		.catch(error => {
			console.error('Fetch error:', error);
		});
}
function fetchRiverHeights() {
	fetch(`fetchRiverHeights.php?url=${url}`)
		.then(response => {
			if (!response.ok) {
				throw new Error('Network response was not ok ' + response.statusText);
			}
			return response.json();
		})
		.then(data => {
			riverData = JSON.parse(data);
			river = true;
			
			//now redraw the tides canvas
			drawCurve(coords,true);
		})
		.catch(error => {
			console.error('Fetch error:', error);
		});
}

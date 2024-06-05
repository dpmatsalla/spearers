function resetMap() {
	riverPoints = [];
	circleMarkers = [];
	tooltips = [];
	riverGroup.clearLayers();
	
	if (loadPoints.length > 0) {
		loadPoints.forEach(addPoint);
	}
}

// Clear canvas, then draw the quadrangles (if the layers toggle is checked)
function drawQuads() {
	ctxm.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
	ctxm.lineWidth = 2;
	
	ctxAreas.forEach(ctxArea => {
		ctxm.beginPath();  // Begin a new path
		ctxArea.vertices.forEach((vertex, index) => {
			const point = map.latLngToContainerPoint(vertex);
			if (index === 0) {
				ctxm.moveTo(point.x, point.y);
			} else {
				let g = 255 * ctxArea.v / 4;
				let r = 255 - g;
				ctxm.strokeStyle = `rgb(${r}, ${g}, 100)`;
				ctxm.lineTo(point.x, point.y);
			}
		});
		ctxm.closePath();
		ctxm.stroke();  // Stroke (draw) the line

		ctxm.lineWidth = 1;
		ctxm.beginPath();  //now draw the circle
		const point1 = map.latLngToContainerPoint(ctxArea.vertices[0]);
		const point2 = map.latLngToContainerPoint(ctxArea.vertices[1]);
		const x = (point1.x + point2.x)/2; 
		const y = (point1.y + point2.y)/2;
		const leng = Math.sqrt((point1.x-x)**2 + (point1.y-y)**2);
		ctxm.arc(x,y, leng, 0, 2*Math.PI);
		ctxm.stroke();
	});
	// Write text
	ctxm.font = '10px Arial';
	ctxm.fillStyle = 'black';
	ctxm.textAlign = 'center';
	riverPoints.forEach(function(point, index) {
		const point1 = map.latLngToContainerPoint(point.latlng);
		ctxm.fillText(index, point1.x, point1.y + 20);
	});		
}

function markerColor(stn) {
    const colorMap = {
        'westend': 'blue',
        'breakfast': 'green',
        'manly': 'purple',
        'coomera': 'lightbrown',
	'noosa': 'orange'
    };
    return colorMap[stn] || 'grey';
}

function addPoint(event) {
	const i = riverPoints.length;  // i is the current point index
	const point = {
		latlng: {
			lat: parseFloat(event.latlng.lat).toFixed(5),
			lng: parseFloat(event.latlng.lng).toFixed(5)
		}
	};

	if (event.w) {
		point.p1 = Number(event.p1);
		point.p2 = Number(event.p2);
		point.w = Number(event.w);  // m
		point.v = Number(event.v);  // kph
		point.stn = event.stn;
	} else {
		if (i === 0) {
			Object.assign(point, { p1: -1, p2: -1, w: 100, v: 3, stn: 555 });
		} else {
			Object.assign(point, {
				p1: i - 1,
				p2: -1,
				w: riverPoints[i - 1].w,
				v: riverPoints[i - 1].v,
				stn: riverPoints[i - 1].stn
			});
		}
	}
	riverPoints.push(point);

	let g = markerColor(point.stn);
	var marker = L.circleMarker(point.latlng, {
		radius: 5,
		color: g,
		fillColor: g,
		fillOpacity: 1.0,
	}).addTo(riverGroup);

	const trackCursor = event => {
		marker.setLatLng(event.latlng);  // Move the marker with the mouse
		riverPoints[i].latlng = event.latlng;  // Move the riverPoints.latlng with the mouse
		tooltips[i].setLatLng(riverPoints[i].latlng);  // Move the associated tooltip
	};
	
	marker.on("mousedown", () => {
		map.dragging.disable();
		map.on("mousemove", trackCursor);
	});

	// Put the marker into the circleMarkers array and set the popup text
	circleMarkers.push(marker);
	setPopup(i);
	
/*  //it's the tooltips that are taking all the time to load!  Write these on the canvas instead
	// Write the index under the circleMarker
	const tooltip = L.tooltip({
		permanent: true,  // Tooltip stays open permanently
		direction: 'bottom',  // Tooltip direction (below the marker)
		offset: [0, 5],  // Offset the tooltip position (adjust as needed)
		className: 'tooltip'  // Custom class for styling
	}).setContent(i.toString())
	  .setLatLng(riverPoints[i].latlng)
	  .addTo(riverGroup);

	tooltips.push(tooltip);
*/
}

function deletePoint(i) {
	// Logic: after deleting index, cycle through all point.p1 and point.p2 and decrease by 1
	riverPoints.splice(i, 1);
	riverPoints.forEach(point => {
		if (point.p1 >= i) point.p1--;
		if (point.p2 === i) point.p2 = -1;
		if (point.p2 > i) point.p2--;
	});
	loadPoints = riverPoints;
	resetMap();
	setupFlowAreas();
	drawQuads();
}

function setPopup(i) {
	const point = riverPoints[i];
	const popupContent = `
		<span style="font-size:10px;text-align:center;"><b id="point">${i}</b>: ${point.latlng.lat},${point.latlng.lng}</span>
		<form id="pointData" action="javascript:updatePt()">
			<label for="p1">Dnstr Pt1: </label>
			<input type="text" id="p1" name="p1" value="${point.p1}" size="2"><br>
			<label for="p2">Dnstr Pt2: </label>
			<input type="text" id="p2" name="p2" value="${point.p2}" size="2"><br>
			<label for="w">RiverWidth: </label>
			<input type="text" id="w" name="w" value="${point.w}" size="3"><br>
			<label for="v">Max Flow: </label>
			<input type="text" id="v" name="v" value="${point.v}" size="3"><br>
			<label for="stn">Tide Stn: </label>
			<input type="text" id="stn" value="${point.stn}" size="3"><br>
			<button type="submit">Update</button>
			<a href="#" onclick="deletePoint(${i})">Delete</a>
		</form>`;
	
	circleMarkers[i].bindPopup(popupContent, { autoPan: false });
}

//function to execute when the popup form is submitted
function updatePt() {
	const i = Number(document.getElementById("point").innerHTML);	//find the right marker
	if (document.getElementById('p1').value < riverPoints.length) riverPoints[i].p1 = document.getElementById('p1').value;
	if (document.getElementById('p2').value < riverPoints.length) riverPoints[i].p2 = document.getElementById('p2').value;
	if (document.getElementById('w').value > 5) riverPoints[i].w = document.getElementById('w').value;
	if (document.getElementById('v').value > 0) riverPoints[i].v = document.getElementById('v').value;
	if (document.getElementById('stn').value > 0) riverPoints[i].stn = document.getElementById('stn').value;
	
	//update the popup message on the marker
	setPopup(i);
	setupFlowAreas();
	drawQuads();
}

function saveRiverPoints() {
	const jsonData = JSON.stringify(riverPoints);
	const fileContent = "let loadStr = '" + jsonData + "';";

	// Use FormData to send data to server-side PHP script
	const formData = new FormData();
	formData.append('fileContent', fileContent);

	fetch('save_riverPoints.php', {
		method: 'POST',
		body: formData
	})
	.then(response => {
		if (response.ok) {
			alert('River points saved successfully as JavaScript file!');
		} else {
			throw new Error('Failed to save river points.');
		}
	})
	.catch(error => {
		console.error('Error saving river points:', error);
		alert('Failed to save river points. Please try again.');
	});
}

function getLocInfo() {
	if (loc == 'breakfast') {
		coords = [-27.43754,153.04233];
		tide_list = tide_loc[1];
		url = "http://www.bom.gov.au/fwo/IDQ65389/IDQ65389.540685.tbl.shtml";
		delta = 1;
		adjust = -0.35;
	} else if (loc == 'coomera') {
		coords = [-27.84684,153.35987];
		tide_list = tide_loc[2];
		url = "http://www.bom.gov.au/fwo/IDQ65388/IDQ65388.540269.tbl.shtml";   //"http://www.bom.gov.au/fwo/IDQ65388/IDQ65388.540673.tbl.shtml";
		delta = 0.5;
		adjust = 0.9;
	} else if (loc == 'manly') {
		coords = [-27.45777,153.19250];
		tide_list = tide_loc[3];
		url = "http://www.bom.gov.au/fwo/IDQ65389/IDQ65389.540495.tbl.shtml";
		delta = 1.2;
		adjust = 0.0;
	} else if (loc == 'noosa') {
		coords = [-26.387749,153.089658];
		tide_list = tide_loc[4];
		url = "http://www.bom.gov.au/fwo/IDQ65390/IDQ65390.540311.tbl.shtml";
		delta = 1;
		adjust = 0.0;
	} else {
		loc = 'westend';
		coords = [-27.488299,152.996411];
		tide_list = tide_loc[0];
		url = "http://www.bom.gov.au/fwo/IDQ65389/IDQ65389.540683.tbl.shtml";
		delta = 1;
		adjust = 0.35;
	}
}

getLocInfo();

const map = L.map('map').setView(coords, 15);
const std = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});
const streets = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
	'attribution':'google Streets',
	'maxZoom':20,
	'minZoom':0,
	'subdomains':['mt0','mt1','mt2','mt3'],
}).addTo(map);
const satellite = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
	'attribution':'google Satellite',
	'maxZoom':20,
	'minZoom':0,
	'subdomains':['mt0','mt1','mt2','mt3'],
});
const navAidsLayer = L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', { maxZoom: 18 });

const stnGroup = L.layerGroup();
const baseLayers = {
	"OpenStreets": std,
	"Streets": streets,
	"Satellite": satellite
};		// Define base layers and overlay
const overlays = {
	'Tide Stations': stnGroup,
	'Navigation Aids': navAidsLayer 
};
L.control.layers(baseLayers, overlays).addTo(map);		// Add layer control to the map

// ****************************************************************************
// Maps
// ****************************************************************************
function SeaflowMap(div, events) {
  var self = this;
  self.events = events;
  // Objects with lat, lon, date, and map library specific coordinate object
  self.locs = [];
  self.recPath = null;
  self.cruiseLayer = null;

  self.cruiseMap = L.map(div,{zoomControl:false}).setView([47, -122], 4);
  L.control.zoom({position:'bottomright'}).addTo(self.cruiseMap);
  L.Icon.Default.imagePath = '/leaflet/images';

  L.tileLayer.provider("Esri.OceanBasemap").addTo(self.cruiseMap);
  //localTileLayer("127.0.0.1:3002").addTo(self.cruiseMap);
  self.zoomed = false;
  self.min = null;
  self.max = null;

  L.control.mousePosition({
    position: "topright",
    separator: "   ",
    lngFormatter: function(lng) { return "Lon: " + lng.toFixed(5); },
    latFormatter: function(lat) { return "Lat: " + lat.toFixed(5); }
  }).addTo(self.cruiseMap);  // add mouse coordinate display

  // Register event handlers here
  $(self.events).on("newsfldata", function(event, data) {
    self.addLocs(data.new);
  });
  $(self.events).on("newcruise", function(event, data) {
    self.locs = [];
    self.update();
    self.zoomed = false;
  });
  $(self.events).on("newrecpath", function(event, data){
    self.recPath = data;
    self.update();
  });

  self.addLocs = function(newLocs) {
    newLocs.forEach(function(loc) {
      if ($.isNumeric(loc.lat) && $.isNumeric(loc.lon)) {
        loc.latLng = new L.latLng(loc.lat, loc.lon);
        self.locs.push(loc);
      }
    });
    self.update();
  };

  self.update = function() {
    if (self.locs.length === 0) {
      return;
    }
    var allLatLngs = [];
    var selectedLatLngs = [];
    self.locs.forEach(function(doc) {
      allLatLngs.push(doc.latLng);
      if (self.min === null && self.max === null) {
        // All points selected if no date range has been set
        selectedLatLngs.push(doc.latLng);
      } else if (doc.date >= self.min && doc.date <= self.max) {
        selectedLatLngs.push(doc.latLng);
      }
    });
    var latestLatLng = allLatLngs[allLatLngs.length-1];
    var boatIcon = L.icon({
      iconUrl: 'leaflet/images/boat.png',
      iconSize: [16, 16],
      weight: 5
    });
    var latestCircle = new L.marker(latestLatLng, {icon: boatIcon});
    var selectedCruiseLine = new L.polyline(selectedLatLngs, {
      color: "red",
      weight: 4,
      opacity: 0.5,
      smoothFactor: 1
    });

    var fg = L.featureGroup([selectedCruiseLine, latestCircle]);

    if(self.recPath){
      var arrow = new L.polyline([latestLatLng, calculatePointAtRotation(latestLatLng, self.recPath.rotation)], {
        color: "green",
        weight: 4,
        opacity: 1,
        smoothFactor: 1
      });
      var decorator = L.polylineDecorator(arrow, {
          patterns: [
              // define a pattern of 10px-wide dashes, repeated every 20px on the line 
              {offset: '100%', repeat: 0, symbol: new L.Symbol.arrowHead({pixelSize: 5, polygon: false, pathOptions: {
                stroke: true,
                color: "green",
                opacity: 1,
                weight: 4}})}
          ]
      });
      fg = L.featureGroup([selectedCruiseLine, latestCircle, arrow, decorator]);
    }
    

    if (self.cruiseLayer) {
      self.cruiseMap.removeLayer(self.cruiseLayer);
    }
    self.cruiseMap.addLayer(fg);
    self.cruiseLayer = fg;
    if (! self.zoomed) {
      // Only zoom to fit once
      self.cruiseMap.fitBounds(fg.getBounds());
      self.zoomed = true;
    }
    self.cruiseMap.panTo(latestLatLng);
  };
}

function localTileLayer(tileHost) {
  var tileURL = 'http://' + tileHost + '/{z}/{x}/{y}.png';
  var attribution = 'Map data &copy; ';
  attribution += '<a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ';
  attribution += '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>';
  return L.tileLayer(tileURL, {
    attribution: attribution,
    maxZoom: 8
  });
}

function calculatePointAtRotation(origLoc, degree){
  var distance = 2;
  var rad = toRadians(degree+180);
  return L.latLng(origLoc.lat+distance*Math.sin(rad), origLoc.lng-distance*Math.cos(rad));
}

function toRadians (angle) {
  return angle * (Math.PI / 180);
}
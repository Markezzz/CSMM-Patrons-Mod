//******************************************************************************************************

//Reset Region Variables (CSMM Patrons Mod)
var resetRegionColor = "#FF0000" //put any html color code in here to make the polygons suit your color needs
var resetRegionTooltip = "This region is marked for reset. Do NOT build here!" //text that will be shown in tooltip if polygon is clicked

//Advanded Claims
var normalColor = "#00FF00"
var reversedColor = "#FF4000"
var hostilefreeColor = "#00FFFF"
var timedColor = "#00FF00"
var leveledColor = "#00FF00"
var portalColor = "#A901DB"
var openhoursColor = "#00FF00"
var notifyColor = "#FF0000"
var commandColor = "#0000FF"
var playerlevelColor = "#BF00FF"
var lcbfreeColor = "#00FF00"

//******************************************************************************************************

var mapinfo = {
	regionsize: 512,
	chunksize: 16,
	tilesize: 128,
	maxzoom: 4
}

function InitMap() {
	// ===============================================================================================
	// 7dtd coordinate transformations

	SDTD_Projection = {
		project: function (latlng) {
			return new L.Point(
				(latlng.lat) / Math.pow(2, mapinfo.maxzoom),
				(latlng.lng) / Math.pow(2, mapinfo.maxzoom) );
		},
		
		unproject: function (point) {
			return new L.LatLng(
				point.x * Math.pow(2, mapinfo.maxzoom),
				point.y * Math.pow(2, mapinfo.maxzoom) );
		}
	};

	SDTD_CRS = L.extend({}, L.CRS.Simple, {
		projection: SDTD_Projection,
		transformation: new L.Transformation(1, 0, -1, 0),

		scale: function (zoom) {
			return Math.pow(2, zoom);
		}
	});

	// ===============================================================================================
	// Map and basic tile layers

	map = L.map('tab_map', {
		zoomControl: false, // Added by Zoomslider
		zoomsliderControl: true,
		attributionControl: false,
		crs: SDTD_CRS
	}).setView([0, 0], Math.max(0, mapinfo.maxzoom - 5));


	var initTime = new Date().getTime();
	var tileLayer = GetSdtdTileLayer (mapinfo, initTime);
	var tileLayerMiniMap = GetSdtdTileLayer (mapinfo, initTime, true);

	// player icon
	var playerIcon = L.icon({
	    iconUrl: '/static/leaflet/images/marker-survivor.png',
	    iconRetinaUrl: '/static/leaflet/images/marker-survivor-2x.png',
	    iconSize: [25, 48],
	    iconAnchor: [12, 24],
	    popupAnchor: [0, -20]
	});
	
	// hostile icon
	var hostileIcon = L.icon({
	    iconUrl: '/static/leaflet/images/marker-zombie.png',
	    iconRetinaUrl: '/static/leaflet/images/marker-zombie-2x.png',
	    iconSize: [25, 33],
	    iconAnchor: [12, 16],
	    popupAnchor: [0, -10]
	});	
	
	// animal icon
	var animalIcon = L.icon({
	    iconUrl: '/static/leaflet/images/marker-animal.png',
	    iconRetinaUrl: '/static/leaflet/images/marker-animal-2x.png',
	    iconSize: [25, 26],
	    iconAnchor: [12, 13],
	    popupAnchor: [0, -10]
	});
	


	// ===============================================================================================
	// Overlays and controls

	var playersOnlineMarkerGroup = L.markerClusterGroup({
		maxClusterRadius: function(zoom) { return zoom >= mapinfo.maxzoom ? 10 : 50; }
	});
	var playersOfflineMarkerGroup = L.markerClusterGroup({
		maxClusterRadius: function(zoom) { return zoom >= mapinfo.maxzoom ? 10 : 50; }
	});
	var hostilesMarkerGroup = L.markerClusterGroup({
		maxClusterRadius: function(zoom) { return zoom >= mapinfo.maxzoom ? 10 : 50; }
	});
	var animalsMarkerGroup = L.markerClusterGroup({
		maxClusterRadius: function(zoom) { return zoom >= mapinfo.maxzoom ? 10 : 50; }
	});

	var densityMismatchMarkerGroupAir = L.markerClusterGroup({
		maxClusterRadius: function(zoom) { return zoom >= mapinfo.maxzoom ? 10 : 50; }
	});
	var densityMismatchMarkerGroupTerrain = L.markerClusterGroup({
		maxClusterRadius: function(zoom) { return zoom >= mapinfo.maxzoom ? 10 : 50; }
	});
	var densityMismatchMarkerGroupNonTerrain = L.markerClusterGroup({
		maxClusterRadius: function(zoom) { return zoom >= mapinfo.maxzoom ? 10 : 50; }
	});


	var layerControl = L.control.layers({
			//"Map": tileLayer
		}, null, {
			collapsed: false
		}
	);
	
	var layerCount = 0;


	tileLayer.addTo(map);

	new L.Control.Coordinates({}).addTo(map);
	
	new L.Control.ReloadTiles({
		autoreload_enable: true,
		autoreload_minInterval: 30,
		autoreload_interval: 120,
		autoreload_defaultOn: false,
		layers: [tileLayer, tileLayerMiniMap]
	}).addTo(map);
	
	layerControl.addOverlay (GetRegionLayer (mapinfo), "Region files");
	layerCount++;
	
	var miniMap = new L.Control.MiniMap(tileLayerMiniMap, {
		zoomLevelOffset: -6,
		toggleDisplay: true
	}).addTo(map);

	var measure = L.control.measure({
		units: {
			sdtdMeters: {
				factor: 0.00001,
				display: 'XMeters',
				decimals: 0
			},
			sdtdSqMeters: {
				factor: 0.000000001,
				display: 'XSqMeters',
				decimals: 0
			}
		},
		primaryLengthUnit: "sdtdMeters",
		primaryAreaUnit: "sdtdSqMeters",
		//activeColor: "#ABE67E",
		//completedColor: "#C8F2BE",
		position: "bottomleft"
	});
	//measure.addTo(map);

	new L.Control.GameTime({}).addTo(map);
	
	if (HasPermission ("webapi.getlandclaims")) {
		layerControl.addOverlay (GetLandClaimsLayer (map, mapinfo), "Land claims");
		layerCount++;
	}
	
	//cpm ->
	layerControl.addOverlay (GetResetRegionsLayer (map, mapinfo), "Reset Regions");
	layerCount++;
	
	if(HasPermission ("web.map"))
	{
		layerControl.addOverlay (GetTraderMarkerLayer (map, mapinfo), "Traders");
	    layerCount++;
	}
	
	if (HasPermission ("webapi.viewallclaims")) {
		layerControl.addOverlay (GetHomesLayer (map, mapinfo), "Player beds");
		layerCount++;

		layerControl.addOverlay (GetNormalClaimsLayer (map, mapinfo), "Adv. Claims Normal");
		layerCount++;
	
		layerControl.addOverlay (GetReversedClaimsLayer (map, mapinfo), "Adv. Claims Reversed");
		layerCount++;
	
		layerControl.addOverlay (GetTimedClaimsLayer (map, mapinfo), "Adv. Claims Timed");
		layerCount++;
	
		layerControl.addOverlay (GetLeveledClaimsLayer (map, mapinfo), "Adv. Claims Leveled");
		layerCount++;
	
		layerControl.addOverlay (GetPortalClaimsLayer (map, mapinfo), "Adv. Claims Portal");
		layerCount++;
	
		layerControl.addOverlay (GetHostilefreeClaimsLayer (map, mapinfo), "Adv. Claims Hostilefree");
		layerCount++;
	
		layerControl.addOverlay (GetOpenhoursClaimsLayer (map, mapinfo), "Adv. Claims Openhours");
		layerCount++;
	
		layerControl.addOverlay (GetNotifyClaimsLayer (map, mapinfo), "Adv. Claims Notify");
		layerCount++;
	
		layerControl.addOverlay (GetCommandClaimsLayer (map, mapinfo), "Adv. Claims Command");
		layerCount++;
			
		layerControl.addOverlay (GetPlayerlevelClaimsLayer (map, mapinfo), "Adv. Claims Playerlevel");
		layerCount++;
		
		layerControl.addOverlay (GetLcbFreeClaimsLayer (map, mapinfo), "Adv. Claims LcbFree");
		layerCount++;
	}
	// <- cpm
	
	if (HasPermission ("webapi.gethostilelocation")) {
		layerControl.addOverlay (hostilesMarkerGroup, "Hostiles (<span id='mapControlHostileCount'>0</span>)");
		layerCount++;
	}
	
	if (HasPermission ("webapi.getanimalslocation")) {
		layerControl.addOverlay (animalsMarkerGroup, "Animals (<span id='mapControlAnimalsCount'>0</span>)");
		layerCount++;
	}
	
	if (HasPermission ("webapi.getplayerslocation")) {
		layerControl.addOverlay (playersOfflineMarkerGroup, "Players (offline) (<span id='mapControlOfflineCount'>0</span>)");
		layerControl.addOverlay (playersOnlineMarkerGroup, "Players (online) (<span id='mapControlOnlineCount'>0</span>)");
		layerCount++;
	}
	
	if (layerCount > 0) {
		layerControl.addTo(map);
	}




	var hostilesMappingList = {};
	var animalsMappingList = {};
	var playersMappingList = {};

	

	// ===============================================================================================
	// Player markers

	$(".leaflet-popup-pane").on('click.action', '.inventoryButton', function(event) {
		ShowInventoryDialog ($(this).data('steamid'));
	});

	var updatingMarkers = false;


	var setPlayerMarkers = function(data) {
		var onlineIds = [];
		updatingMarkers = true;
		$.each( data, function( key, val ) {
			var marker;
			if (playersMappingList.hasOwnProperty(val.steamid)) {
				marker = playersMappingList[val.steamid].currentPosMarker;
			} else {
				marker = L.marker([val.position.x, val.position.z], {icon: playerIcon}).bindPopup(
					"Player: " + $("<div>").text(val.name).html() +
					(HasPermission ("webapi.getplayerinventory") ?
						"<br/><a class='inventoryButton' data-steamid='"+val.steamid+"'>Show inventory</a>"
						: "")
				);
				marker.on("move", function ( e ) {
					if ( this.isPopupOpen () ) {
						map.flyTo (e.latlng, map.getZoom ());
					}
				});
				playersMappingList[val.steamid] = { online: !val.online };
			}
			
			if (val.online) {
				onlineIds.push (val.steamid);
			}
			
			oldpos = marker.getLatLng ();
			if ( playersMappingList[val.steamid].online != val.online ) {
				if (playersMappingList[val.steamid].online) {
					playersOnlineMarkerGroup.removeLayer(marker);
					playersOfflineMarkerGroup.addLayer(marker);
				} else {
					playersOfflineMarkerGroup.removeLayer(marker);
					playersOnlineMarkerGroup.addLayer(marker);
				}
			}
			if ( oldpos.lat != val.position.x || oldpos.lng != val.position.z ) {
				marker.setLatLng([val.position.x, val.position.z]);
				if (val.online) {
						marker.setOpacity(1.0);
				} else {
						marker.setOpacity(0.5);
				}
			}

			val.currentPosMarker = marker;
			playersMappingList[val.steamid] = val;
		});
		
		var online = 0;
		var offline = 0;
		$.each ( playersMappingList, function ( key, val ) {
			if ( val.online && onlineIds.indexOf (key) < 0 ) {
				var marker = val.currentPosMarker;
				playersOnlineMarkerGroup.removeLayer(marker);
				playersOfflineMarkerGroup.addLayer(marker);
				val.online = false;
			}
			if (val.online) {
				online++;
			} else {
				offline++;
			}
		});
		
		updatingMarkers = false;

		$( "#mapControlOnlineCount" ).text( online );
		$( "#mapControlOfflineCount" ).text( offline );
	}

	var updatePlayerTimeout;
	var playerUpdateCount = -1;
	var updatePlayerEvent = function() {
		playerUpdateCount++;
		
		$.getJSON( "../api/getplayerslocation" + ((playerUpdateCount % 15) == 0 ? "?offline=true" : ""))
		.done(setPlayerMarkers)
		.fail(function(jqxhr, textStatus, error) {
			console.log("Error fetching players list");
		})
		.always(function() {
			updatePlayerTimeout = window.setTimeout(updatePlayerEvent, 4000);
		});
	}

	tabs.on ("tabbedcontenttabopened", function (event, data) {
		if (data.newTab === "#tab_map") {
			if (HasPermission ("webapi.getplayerslocation")) {
				updatePlayerEvent ();
			}
		} else {
			window.clearTimeout (updatePlayerTimeout);
		}
	});
	
	if (tabs.tabbedContent ("isTabOpen", "tab_map")) {
		if (HasPermission ("webapi.getplayerslocation")) {
			updatePlayerEvent ();
		}
	}




	// ===============================================================================================
	// Hostiles markers

	var setHostileMarkers = function(data) {
		updatingMarkersHostile = true;
		
		var hostileCount = 0;

		hostilesMarkerGroup.clearLayers();
		
		$.each( data, function( key, val ) {
			var marker;
			if (hostilesMappingList.hasOwnProperty(val.id)) {
				marker = hostilesMappingList[val.id].currentPosMarker;
			} else {
				marker = L.marker([val.position.x, val.position.z], {icon: hostileIcon}).bindPopup(
					"Hostile: " + val.name
				);
				//hostilesMappingList[val.id] = { };
				hostilesMarkerGroup.addLayer(marker);
			}

			var bAbort = false;
			
			oldpos = marker.getLatLng ();

			//if ( oldpos.lat != val.position.x || oldpos.lng != val.position.z ) {
			//	hostilesMarkerGroup.removeLayer(marker);
				marker.setLatLng([val.position.x, val.position.z]);
				marker.setOpacity(1.0);
				hostilesMarkerGroup.addLayer(marker);
			//}

			val.currentPosMarker = marker;
			hostilesMappingList[val.id] = val;
			
			hostileCount++;
		});
		
		$( "#mapControlHostileCount" ).text( hostileCount );
		
		updatingMarkersHostile = false;
	}

	var updateHostileTimeout;
	var updateHostileEvent = function() {
		$.getJSON( "../api/gethostilelocation")
		.done(setHostileMarkers)
		.fail(function(jqxhr, textStatus, error) {
			console.log("Error fetching hostile list");
		})
		.always(function() {
			updateHostileTimeout = window.setTimeout(updateHostileEvent, 4000);
		});
	}

	tabs.on ("tabbedcontenttabopened", function (event, data) {
		if (data.newTab === "#tab_map") {
			if (HasPermission ("webapi.gethostilelocation")) {
				updateHostileEvent ();
			}
		} else {
			window.clearTimeout (updateHostileTimeout);
		}
	});
	
	if (tabs.tabbedContent ("isTabOpen", "tab_map")) {
		if (HasPermission ("webapi.gethostilelocation")) {
			updateHostileEvent ();
		}
	}



	// ===============================================================================================
	// Animals markers

	var setAnimalMarkers = function(data) {
		updatingMarkersAnimals = true;
		
		var animalsCount = 0;

		animalsMarkerGroup.clearLayers();
		
		$.each( data, function( key, val ) {
			var marker;
			if (animalsMappingList.hasOwnProperty(val.id)) {
				marker = animalsMappingList[val.id].currentPosMarker;
			} else {
				marker = L.marker([val.position.x, val.position.z], {icon: animalIcon}).bindPopup(
					"Animal: " + val.name
				);
				//animalsMappingList[val.id] = { };
				animalsMarkerGroup.addLayer(marker);
			}

			var bAbort = false;
			
			oldpos = marker.getLatLng ();

			//if ( oldpos.lat != val.position.x || oldpos.lng != val.position.z ) {
			//	animalsMarkerGroup.removeLayer(marker);
				marker.setLatLng([val.position.x, val.position.z]);
				marker.setOpacity(1.0);
				animalsMarkerGroup.addLayer(marker);
			//}

			val.currentPosMarker = marker;
			animalsMappingList[val.id] = val;
			
			animalsCount++;
		});
		
		$( "#mapControlAnimalsCount" ).text( animalsCount );
		
		updatingMarkersAnimals = false;
	}

	var updateAnimalsTimeout;
	var updateAnimalsEvent = function() {
		$.getJSON( "../api/getanimalslocation")
		.done(setAnimalMarkers)
		.fail(function(jqxhr, textStatus, error) {
			console.log("Error fetching animals list");
		})
		.always(function() {
			updateAnimalsTimeout = window.setTimeout(updateAnimalsEvent, 4000);
		});
	}

	tabs.on ("tabbedcontenttabopened", function (event, data) {
		if (data.newTab === "#tab_map") {
			if (HasPermission ("webapi.getanimalslocation")) {
				updateAnimalsEvent ();
			}
		} else {
			window.clearTimeout (updateAnimalsTimeout);
		}
	});
	
	if (tabs.tabbedContent ("isTabOpen", "tab_map")) {
		if (HasPermission ("webapi.getanimalslocation")) {
			updateAnimalsEvent ();
		}
	}

	
	
	
	
	
	
	
	
	// ===============================================================================================
	// Density markers

	var setDensityMarkers = function(data) {
		var densityCountAir = 0;
		var densityCountTerrain = 0;
		var densityCountNonTerrain = 0;

		densityMismatchMarkerGroupAir.clearLayers();
		densityMismatchMarkerGroupTerrain.clearLayers();
		densityMismatchMarkerGroupNonTerrain.clearLayers();
		
		
		var downloadCsv = true;
		var downloadJson = false;
		
		if (downloadJson) {
			var jsonAir = [];
			var jsonTerrain = [];
			var jsonNonTerrain = [];
		}
		if (downloadCsv) {
			var csvAir = "x;y;z;Density;IsTerrain;BvType\r\n";
			var csvTerrain = "x;y;z;Density;IsTerrain;BvType\r\n";
			var csvNonTerrain = "x;y;z;Density;IsTerrain;BvType\r\n";
		}
		
		$.each( data, function( key, val ) {
			if (val.bvtype == 0) {
				marker = L.marker([val.x, val.z]).bindPopup(
					"Density Mismatch: <br>Position: " + val.x + " " + val.y + " " + val.z + "<br>Density: " + val.density + "<br>isTerrain: " + val.terrain + "<br>bv.type: " + val.bvtype
				);
				densityMismatchMarkerGroupAir.addLayer(marker);
				densityCountAir++;
				if (downloadJson) {
					jsonAir.push (val);
				}
				if (downloadCsv) {
					csvAir += val.x + ";" + val.y + ";" + val.z + ";" + val.density + ";" + val.terrain + ";" + val.bvtype + "\r\n";
				}
			} else if (val.terrain) {
				marker = L.marker([val.x, val.z]).bindPopup(
					"Density Mismatch: <br>Position: " + val.x + " " + val.y + " " + val.z + "<br>Density: " + val.density + "<br>isTerrain: " + val.terrain + "<br>bv.type: " + val.bvtype
				);
				densityMismatchMarkerGroupTerrain.addLayer(marker);
				densityCountTerrain++;
				if (downloadJson) {
					jsonTerrain.push (val);
				}
				if (downloadCsv) {
					csvTerrain += val.x + ";" + val.y + ";" + val.z + ";" + val.density + ";" + val.terrain + ";" + val.bvtype + "\r\n";
				}
			} else {
				marker = L.marker([val.x, val.z]).bindPopup(
					"Density Mismatch: <br>Position: " + val.x + " " + val.y + " " + val.z + "<br>Density: " + val.density + "<br>isTerrain: " + val.terrain + "<br>bv.type: " + val.bvtype
				);
				densityMismatchMarkerGroupNonTerrain.addLayer(marker);
				densityCountNonTerrain++;
				if (downloadJson) {
					jsonNonTerrain.push (val);
				}
				if (downloadCsv) {
					csvNonTerrain += val.x + ";" + val.y + ";" + val.z + ";" + val.density + ";" + val.terrain + ";" + val.bvtype + "\r\n";
				}
			}
		});

		layerControl.addOverlay (densityMismatchMarkerGroupAir, "Density Mismatches Air (<span id='mapControlDensityCountAir'>0</span>)");
		layerControl.addOverlay (densityMismatchMarkerGroupTerrain, "Density Mismatches Terrain (<span id='mapControlDensityCountTerrain'>0</span>)");
		layerControl.addOverlay (densityMismatchMarkerGroupNonTerrain, "Density Mismatches NonTerrain (<span id='mapControlDensityCountNonTerrain'>0</span>)");

		$( "#mapControlDensityCountAir" ).text( densityCountAir );
		$( "#mapControlDensityCountTerrain" ).text( densityCountTerrain );
		$( "#mapControlDensityCountNonTerrain" ).text( densityCountNonTerrain );
		
		if (downloadJson) {
			download ("air-negative-density.json", JSON.stringify(jsonAir, null, '\t'));
			download ("terrain-positive-density.json", JSON.stringify(jsonTerrain, null, '\t'));
			download ("nonterrain-negative-density.json", JSON.stringify(jsonNonTerrain, null, '\t'));
		}
		if (downloadCsv) {
			download ("air-negative-density.csv", csvAir);
			download ("terrain-positive-density.csv", csvTerrain);
			download ("nonterrain-negative-density.csv", csvNonTerrain);
		}
		
		function download(filename, text) {
			var element = document.createElement('a');
			var file = new Blob([text], {type: 'text/plain'});
			element.href = URL.createObjectURL(file);
			element.download = filename;

			element.style.display = 'none';
			document.body.appendChild(element);

			element.click();

			document.body.removeChild(element);
		}
	}

	$.getJSON("densitymismatch.json")
	.done(setDensityMarkers)
	.fail(function(jqxhr, textStatus, error) {
		console.log("Error fetching density mismatch list");
	});

}





function StartMapModule () {
	$.getJSON( "../map/mapinfo.json")
	.done(function(data) {
		mapinfo.tilesize = data.blockSize;
		mapinfo.maxzoom = data.maxZoom;
	})
	.fail(function(jqxhr, textStatus, error) {
		console.log ("Error fetching map information");
	})
	.always(function() {
		InitMap ();
	});
}

//cpm
function GetResetRegionsLayer (map, mapinfo) {
	
	var resetRegionsGroup = L.layerGroup();
	
	var setResetRegions = function(data) {
		resetRegionsGroup.clearLayers();
					
		$.each(data, function (index, value) {	//console.log(value);
				
			var polygon = L.polygon([
			[value.E,value.S],
			[value.W,value.S],
			[value.W,value.N],
			[value.E,value.N]
			]);
			polygon.setStyle({weight:1,fillColor: resetRegionColor,color: resetRegionColor,fillOpacity:0.15});
			polygon.bindPopup(resetRegionTooltip);
			
			resetRegionsGroup.addLayer(polygon);
		});
		
	}
		
	
  	var updateResetRegionsEvent = function() {
		var port = location.port;
		port = +port + 1;
		var hostname = location.hostname;
				
		$.getJSON("http://" + hostname + ":" + port + "/api/getmapclaims?type=resetregion")
		.done(setResetRegions)
		.fail(function(jqxhr, textStatus, error) {
			console.log("Error fetching reset regions claim list");
		})
	}
		
	map.on('overlayadd', function(e) {
		if (e.layer == resetRegionsGroup) {
			updateResetRegionsEvent();
		}
	});

	return resetRegionsGroup;
}

function GetNormalClaimsLayer (map, mapinfo) {
	
	var normalClaimsGroup = L.layerGroup();
	
	// adv. Claim icon
	var advClaimIcon = L.icon({
	    iconUrl: '/static/leaflet/images/layers.png',
	    iconRetinaUrl: '/static/leaflet/images/layers-2x.png',
	    iconSize: [25, 26],
	    iconAnchor: [12, 13],
	    popupAnchor: [0, -10]
	});
	
	var marker;
	
	var setNormal = function(data) {
		normalClaimsGroup.clearLayers();
					
		$.each(data, function (index, value) {	//console.log(value);
				
			var polygon = L.polygon([
			[value.E,value.S],
			[value.W,value.S],
			[value.W,value.N],
			[value.E,value.N]
			]);
			polygon.setStyle({weight:1,fillColor: normalColor,color: normalColor,fillOpacity:0.15});
			
			var normalTooltip = "Name: " + value.Name + " Type: Normal";
			//polygon.bindPopup(normalTooltip);
			
			normalClaimsGroup.addLayer(polygon);
			
			marker = L.marker([value.W, value.N], {icon: advClaimIcon});
			marker.bindPopup(normalTooltip);
			normalClaimsGroup.addLayer(marker);
		});
		
	}

	var updateNormalEvent = function() {
		var port = location.port;
		port = +port + 1;
		var hostname = location.hostname;
				
		$.getJSON("http://" + hostname + ":" + port + "/api/getmapclaims?type=normal")
		.done(setNormal)
		.fail(function(jqxhr, textStatus, error) {
			console.log("Error fetching normal claim list");
		})
	}
		
	map.on('overlayadd', function(e) {
		if (e.layer == normalClaimsGroup) {
			updateNormalEvent();
		}
	});

	return normalClaimsGroup;
}

function GetReversedClaimsLayer (map, mapinfo) {
	
	var reversedClaimsGroup = L.layerGroup();
	
	// adv. Claim icon
	var advClaimIcon = L.icon({
	    iconUrl: '/static/leaflet/images/layers.png',
	    iconRetinaUrl: '/static/leaflet/images/layers-2x.png',
	    iconSize: [25, 26],
	    iconAnchor: [12, 13],
	    popupAnchor: [0, -10]
	});
	
	var marker;
	
	var setReversed = function(data) {
		reversedClaimsGroup.clearLayers();
					
		$.each(data, function (index, value) {	//console.log(value);
				
			var polygon = L.polygon([
			[value.E,value.S],
			[value.W,value.S],
			[value.W,value.N],
			[value.E,value.N]
			]);
			polygon.setStyle({weight:1,fillColor: reversedColor,color: reversedColor,fillOpacity:0.15});
			
			var reversedTooltip = "Name: " + value.Name + " Type: Reversed";
			//polygon.bindPopup(reversedTooltip);
			
			reversedClaimsGroup.addLayer(polygon);
			
			marker = L.marker([value.W, value.N], {icon: advClaimIcon});
			marker.bindPopup(reversedTooltip);
			reversedClaimsGroup.addLayer(marker);
		});
		
	}

	var updateReversedEvent = function() {
		var port = location.port;
		port = +port + 1;
		var hostname = location.hostname;
				
		$.getJSON("http://" + hostname + ":" + port + "/api/getmapclaims?type=reversed")
		.done(setReversed)
		.fail(function(jqxhr, textStatus, error) {
			console.log("Error fetching reversed claim list");
		})
	}
		
	map.on('overlayadd', function(e) {
		if (e.layer == reversedClaimsGroup) {
			updateReversedEvent();
		}
	});

	return reversedClaimsGroup;
}

function GetHostilefreeClaimsLayer (map, mapinfo) {
	
	var hostilefreeClaimsGroup = L.layerGroup();
	
	// adv. Claim icon
	var advClaimIcon = L.icon({
	    iconUrl: '/static/leaflet/images/layers.png',
	    iconRetinaUrl: '/static/leaflet/images/layers-2x.png',
	    iconSize: [25, 26],
	    iconAnchor: [12, 13],
	    popupAnchor: [0, -10]
	});
	
	var marker;
	
	var setHostilefree = function(data) {
		hostilefreeClaimsGroup.clearLayers();
					
		$.each(data, function (index, value) {	//console.log(value);
				
			var polygon = L.polygon([
			[value.E,value.S],
			[value.W,value.S],
			[value.W,value.N],
			[value.E,value.N]
			]);
			polygon.setStyle({weight:1,fillColor: hostilefreeColor,color: hostilefreeColor,fillOpacity:0.15});
			
			var hostilefreeTooltip = "Name: " + value.Name + " Type: Hostilefree";
			//polygon.bindPopup(hostilefreeTooltip);
			
			hostilefreeClaimsGroup.addLayer(polygon);
			
			marker = L.marker([value.W, value.N], {icon: advClaimIcon});
			marker.bindPopup(hostilefreeTooltip);
			hostilefreeClaimsGroup.addLayer(marker);
		});
		
	}

	var updateHostilefreeEvent = function() {
		var port = location.port;
		port = +port + 1;
		var hostname = location.hostname;
				
		$.getJSON("http://" + hostname + ":" + port + "/api/getmapclaims?type=hostilefree")
		.done(setHostilefree)
		.fail(function(jqxhr, textStatus, error) {
			console.log("Error fetching hostilefree claim list");
		})
	}
		
	map.on('overlayadd', function(e) {
		if (e.layer == hostilefreeClaimsGroup) {
			updateHostilefreeEvent();
		}
	});

	return hostilefreeClaimsGroup;
}

function GetTimedClaimsLayer (map, mapinfo) {
	
	var timedClaimsGroup = L.layerGroup();
	
	// adv. Claim icon
	var advClaimIcon = L.icon({
	    iconUrl: '/static/leaflet/images/layers.png',
	    iconRetinaUrl: '/static/leaflet/images/layers-2x.png',
	    iconSize: [25, 26],
	    iconAnchor: [12, 13],
	    popupAnchor: [0, -10]
	});
	
	var marker;
	
	var setTimed = function(data) {
		timedClaimsGroup.clearLayers();
					
		$.each(data, function (index, value) {	//console.log(value);
				
			var polygon = L.polygon([
			[value.E,value.S],
			[value.W,value.S],
			[value.W,value.N],
			[value.E,value.N]
			]);
			polygon.setStyle({weight:1,fillColor: timedColor,color: timedColor,fillOpacity:0.15});
			
			var timedTooltip = "Name: " + value.Name + " Type: " + value.Type;
			//polygon.bindPopup(timedTooltip);
			
			timedClaimsGroup.addLayer(polygon);
			
			marker = L.marker([value.W, value.N], {icon: advClaimIcon});
			marker.bindPopup(timedTooltip);
			timedClaimsGroup.addLayer(marker);
		});
		
	}

	var updateTimedEvent = function() {
		var port = location.port;
		port = +port + 1;
		var hostname = location.hostname;
				
		$.getJSON("http://" + hostname + ":" + port + "/api/getmapclaims?type=timed")
		.done(setTimed)
		.fail(function(jqxhr, textStatus, error) {
			console.log("Error fetching timed claim list");
		})
	}
		
	map.on('overlayadd', function(e) {
		if (e.layer == timedClaimsGroup) {
			updateTimedEvent();
		}
	});

	return timedClaimsGroup;
}

function GetLeveledClaimsLayer (map, mapinfo) {
	
	var leveledClaimsGroup = L.layerGroup();
	
	// adv. Claim icon
	var advClaimIcon = L.icon({
	    iconUrl: '/static/leaflet/images/layers.png',
	    iconRetinaUrl: '/static/leaflet/images/layers-2x.png',
	    iconSize: [25, 26],
	    iconAnchor: [12, 13],
	    popupAnchor: [0, -10]
	});
	
	var marker;
	
	var setLeveled = function(data) {
		leveledClaimsGroup.clearLayers();
					
		$.each(data, function (index, value) {	//console.log(value);
				
			var polygon = L.polygon([
			[value.E,value.S],
			[value.W,value.S],
			[value.W,value.N],
			[value.E,value.N]
			]);
			polygon.setStyle({weight:1,fillColor: leveledColor,color: leveledColor,fillOpacity:0.15});
			
			var leveledTooltip = "Name: " + value.Name + " Type: " + value.Type;
			//polygon.bindPopup(leveledTooltip);
			
			leveledClaimsGroup.addLayer(polygon);
			
			marker = L.marker([value.W, value.N], {icon: advClaimIcon});
			marker.bindPopup(leveledTooltip);
			leveledClaimsGroup.addLayer(marker);
		});
		
	}

	var updateLeveledEvent = function() {
		var port = location.port;
		port = +port + 1;
		var hostname = location.hostname;
				
		$.getJSON("http://" + hostname + ":" + port + "/api/getmapclaims?type=leveled")
		.done(setLeveled)
		.fail(function(jqxhr, textStatus, error) {
			console.log("Error fetching leveled claim list");
		})
	}
		
	map.on('overlayadd', function(e) {
		if (e.layer == leveledClaimsGroup) {
			updateLeveledEvent();
		}
	});

	return leveledClaimsGroup;
}

function GetPortalClaimsLayer (map, mapinfo) {
	
	var portalClaimsGroup = L.layerGroup();
	// adv. Claim icon
	var advClaimIcon = L.icon({
	    iconUrl: '/static/leaflet/images/layers.png',
	    iconRetinaUrl: '/static/leaflet/images/layers-2x.png',
	    iconSize: [25, 26],
	    iconAnchor: [12, 13],
	    popupAnchor: [0, -10]
	});
	
	var marker;
	
	var setPortal = function(data) {
		portalClaimsGroup.clearLayers();
					
		$.each(data, function (index, value) {	//console.log(value);
				
			var polygon = L.polygon([
			[value.E,value.S],
			[value.W,value.S],
			[value.W,value.N],
			[value.E,value.N]
			]);
			polygon.setStyle({weight:1,fillColor: portalColor,color: portalColor,fillOpacity:0.15});
			
			var portalTooltip = "Name: " + value.Name + " Type: " + value.Type;
			//polygon.bindPopup(portalTooltip);
			
			portalClaimsGroup.addLayer(polygon);
			
			marker = L.marker([value.W, value.N], {icon: advClaimIcon});
			marker.bindPopup(portalTooltip);
			portalClaimsGroup.addLayer(marker);
		});
		
	}

	var updatePortalEvent = function() {
		var port = location.port;
		port = +port + 1;
		var hostname = location.hostname;
				
		$.getJSON("http://" + hostname + ":" + port + "/api/getmapclaims?type=portal")
		.done(setPortal)
		.fail(function(jqxhr, textStatus, error) {
			console.log("Error fetching portal claim list");
		})
	}
		
	map.on('overlayadd', function(e) {
		if (e.layer == portalClaimsGroup) {
			updatePortalEvent();
		}
	});

	return portalClaimsGroup;
}

function GetOpenhoursClaimsLayer (map, mapinfo) {
	
	var openhoursClaimsGroup = L.layerGroup();
	// adv. Claim icon
	var advClaimIcon = L.icon({
	    iconUrl: '/static/leaflet/images/layers.png',
	    iconRetinaUrl: '/static/leaflet/images/layers-2x.png',
	    iconSize: [25, 26],
	    iconAnchor: [12, 13],
	    popupAnchor: [0, -10]
	});
	
	var marker;
	
	var setOpenhours = function(data) {
		openhoursClaimsGroup.clearLayers();
					
		$.each(data, function (index, value) {	//console.log(value);
				
			var polygon = L.polygon([
			[value.E,value.S],
			[value.W,value.S],
			[value.W,value.N],
			[value.E,value.N]
			]);
			polygon.setStyle({weight:1,fillColor: openhoursColor,color: openhoursColor,fillOpacity:0.15});
			
			var openhoursTooltip = "Name: " + value.Name + " Type: " + value.Type;
			//polygon.bindPopup(openhoursTooltip);
			
			openhoursClaimsGroup.addLayer(polygon);
			
			marker = L.marker([value.W, value.N], {icon: advClaimIcon});
			marker.bindPopup(openhoursTooltip);
			openhoursClaimsGroup.addLayer(marker);
		});
		
	}

	var updateOpenhoursEvent = function() {
		var port = location.port;
		port = +port + 1;
		var hostname = location.hostname;
				
		$.getJSON("http://" + hostname + ":" + port + "/api/getmapclaims?type=openhours")
		.done(setOpenhours)
		.fail(function(jqxhr, textStatus, error) {
			console.log("Error fetching openhours claim list");
		})
	}
		
	map.on('overlayadd', function(e) {
		if (e.layer == openhoursClaimsGroup) {
			updateOpenhoursEvent();
		}
	});

	return openhoursClaimsGroup;
}

function GetNotifyClaimsLayer (map, mapinfo) {
	
	var notifyClaimsGroup = L.layerGroup();
	
	// adv. Claim icon
	var advClaimIcon = L.icon({
	    iconUrl: '/static/leaflet/images/layers.png',
	    iconRetinaUrl: '/static/leaflet/images/layers-2x.png',
	    iconSize: [25, 26],
	    iconAnchor: [12, 13],
	    popupAnchor: [0, -10]
	});
	
	var marker;
	
	var setNotify = function(data) {
		notifyClaimsGroup.clearLayers();
					
		$.each(data, function (index, value) {	//console.log(value);
				
			var polygon = L.polygon([
			[value.E,value.S],
			[value.W,value.S],
			[value.W,value.N],
			[value.E,value.N]
			]);
			polygon.setStyle({weight:1,fillColor: notifyColor,color: notifyColor,fillOpacity:0.15});
			
			var notifyTooltip = "Name: " + value.Name + " Type: " + value.Type;
			//polygon.bindPopup(notifyTooltip);
			
			notifyClaimsGroup.addLayer(polygon);
			
			marker = L.marker([value.W, value.N], {icon: advClaimIcon});
			marker.bindPopup(notifyTooltip);
			notifyClaimsGroup.addLayer(marker);
		});
		
	}

	var updateNotifyEvent = function() {
		var port = location.port;
		port = +port + 1;
		var hostname = location.hostname;
				
		$.getJSON("http://" + hostname + ":" + port + "/api/getmapclaims?type=notify")
		.done(setNotify)
		.fail(function(jqxhr, textStatus, error) {
			console.log("Error fetching notify claim list");
		})
	}
		
	map.on('overlayadd', function(e) {
		if (e.layer == notifyClaimsGroup) {
			updateNotifyEvent();
		}
	});

	return notifyClaimsGroup;
}

function GetCommandClaimsLayer (map, mapinfo) {
	
	var commandClaimsGroup = L.layerGroup();
		
	// adv. Claim icon
	var advClaimIcon = L.icon({
	    iconUrl: '/static/leaflet/images/layers.png',
	    iconRetinaUrl: '/static/leaflet/images/layers-2x.png',
	    iconSize: [25, 26],
	    iconAnchor: [12, 13],
	    popupAnchor: [0, -10]
	});
	
	var marker;
	
	var setCommand = function(data) {
		commandClaimsGroup.clearLayers();
							
		$.each(data, function (index, value) {	//console.log(value);
				
			var polygon = L.polygon([
			[value.E,value.S],
			[value.W,value.S],
			[value.W,value.N],
			[value.E,value.N]
			]);
			polygon.setStyle({weight:1,fillColor: commandColor,color: commandColor,fillOpacity:0.15});
			
			var commandTooltip = "Name: " + value.Name + " Type: " + value.Type;
			//polygon.bindPopup(commandTooltip);
			
			commandClaimsGroup.addLayer(polygon);
						
			marker = L.marker([value.W, value.N], {icon: advClaimIcon});
			marker.bindPopup(commandTooltip);
			commandClaimsGroup.addLayer(marker);
		});
		
	}

	var updateCommandEvent = function() {
		var port = location.port;
		port = +port + 1;
		var hostname = location.hostname;
				
		$.getJSON("http://" + hostname + ":" + port + "/api/getmapclaims?type=command")
		.done(setCommand)
		.fail(function(jqxhr, textStatus, error) {
			console.log("Error fetching command claim list");
		})
	}
		
	map.on('overlayadd', function(e) {
		if (e.layer == commandClaimsGroup) {
			updateCommandEvent();
		}
	});

	return commandClaimsGroup;
}

function GetPlayerlevelClaimsLayer (map, mapinfo) {
	
	var playerlevelClaimsGroup = L.layerGroup();
	
	// adv. Claim icon
	var advClaimIcon = L.icon({
	    iconUrl: '/static/leaflet/images/layers.png',
	    iconRetinaUrl: '/static/leaflet/images/layers-2x.png',
	    iconSize: [25, 26],
	    iconAnchor: [12, 13],
	    popupAnchor: [0, -10]
	});
	
	var marker;
	
	var setPlayerlevel = function(data) {
		playerlevelClaimsGroup.clearLayers();
					
		$.each(data, function (index, value) {	//console.log(value);
				
			var polygon = L.polygon([
			[value.E,value.S],
			[value.W,value.S],
			[value.W,value.N],
			[value.E,value.N]
			]);
			polygon.setStyle({weight:1,fillColor: playerlevelColor,color: playerlevelColor,fillOpacity:0.15});
			
			var playerlevelTooltip = "Name: " + value.Name + " Type: " + value.Type;
			//polygon.bindPopup(playerlevelTooltip);
			
			playerlevelClaimsGroup.addLayer(polygon);
			
			marker = L.marker([value.W, value.N], {icon: advClaimIcon});
			marker.bindPopup(playerlevelTooltip);
			playerlevelClaimsGroup.addLayer(marker);
		});
		
	}

	var updatePlayerlevelEvent = function() {
		var port = location.port;
		port = +port + 1;
		var hostname = location.hostname;
				
		$.getJSON("http://" + hostname + ":" + port + "/api/getmapclaims?type=playerlevel")
		.done(setPlayerlevel)
		.fail(function(jqxhr, textStatus, error) {
			console.log("Error fetching playerlevel claim list");
		})
	}
		
	map.on('overlayadd', function(e) {
		if (e.layer == playerlevelClaimsGroup) {
			updatePlayerlevelEvent();
		}
	});

	return playerlevelClaimsGroup;
}

function GetTraderMarkerLayer (map, mapinfo) {
	
	var traderMarkerGroup = L.layerGroup();
	
	// Trader icon
	var traderIcon = L.icon({
	    iconUrl: '/static/leaflet/images/layers.png',
	    iconRetinaUrl: '/static/leaflet/images/layers.png',
	    iconSize: [25, 26],
	    iconAnchor: [12, 13],
	    popupAnchor: [0, -10],
		correction: [20, 18]
	});
		
	var setTraderMarkers = function(xml, decorationname, icon) {
		traderMarkerGroup.clearLayers();
		
		var $xml = $(xml);
		var $decoration = $xml.find("decoration[name*='"+decorationname+"']");
		$decoration.each( function(key, val){
			var position = $(this).attr("position").split(",");
			var marker;
			if (icon.options.hasOwnProperty('correction')){
				position [0] = String(parseInt(position [0])+icon.options.correction[0]);
				position [2] = String(parseInt(position [2])+icon.options.correction[1]);
			}
			marker = L.marker([position[0], position[2]], {icon: icon});
			marker.bindPopup("Trader");
			traderMarkerGroup.addLayer(marker);
		});
	}

	var updateTraderMarkerEvent = function() {
		$.ajax({
		type: "GET",
		url: "prefabs.xml",
		dataType: "xml",
		success: function(xml) {
			setTraderMarkers(xml, "trader", traderIcon);
			}
		});
	}
		
	map.on('overlayadd', function(e) {
		if (e.layer == traderMarkerGroup) {
			updateTraderMarkerEvent();
		}
	});

	return traderMarkerGroup;
}

function GetLcbFreeClaimsLayer (map, mapinfo) {
	
	var lcbfreeClaimsGroup = L.layerGroup();
	
	// adv. Claim icon
	var advClaimIcon = L.icon({
	    iconUrl: '/static/leaflet/images/layers.png',
	    iconRetinaUrl: '/static/leaflet/images/layers-2x.png',
	    iconSize: [25, 26],
	    iconAnchor: [12, 13],
	    popupAnchor: [0, -10]
	});
	
	var marker;
	
	var setLcbFree = function(data) {
		lcbfreeClaimsGroup.clearLayers();
					
		$.each(data, function (index, value) {	//console.log(value);
				
			var polygon = L.polygon([
			[value.E,value.S],
			[value.W,value.S],
			[value.W,value.N],
			[value.E,value.N]
			]);
			polygon.setStyle({weight:1,fillColor: lcbfreeColor,color: lcbfreeColor,fillOpacity:0.15});
			
			var lcbFreeTooltip = "Name: " + value.Name + " Type: " + value.Type;
			//polygon.bindPopup(playerlevelTooltip);
			
			lcbfreeClaimsGroup.addLayer(polygon);
			
			marker = L.marker([value.W, value.N], {icon: advClaimIcon});
			marker.bindPopup(lcbFreeTooltip);
			lcbfreeClaimsGroup.addLayer(marker);
		});
		
	}

	var updateLcbFreeEvent = function() {
		var port = location.port;
		port = +port + 1;
		var hostname = location.hostname;
				
		$.getJSON("http://" + hostname + ":" + port + "/api/getmapclaims?type=lcbfree")
		.done(setLcbFree)
		.fail(function(jqxhr, textStatus, error) {
			console.log("Error fetching lcbfree claim list");
		})
	}
		
	map.on('overlayadd', function(e) {
		if (e.layer == lcbfreeClaimsGroup) {
			updateLcbFreeEvent();
		}
	});

	return lcbfreeClaimsGroup;
}

function GetHomesLayer (map, mapinfo) {
	var homesGroup = L.layerGroup();
	var homesClusterGroup = L.markerClusterGroup({
		disableClusteringAtZoom: mapinfo.maxzoom,
		singleMarkerMode: true,
		maxClusterRadius: 50
	});
	var homesRectGroup = L.layerGroup();
	homesGroup.addLayer(homesClusterGroup);
	homesGroup.addLayer(homesRectGroup);
	var maxZoomForCluster = -1;


	var sethomes = function(data) {
		homesClusterGroup.clearLayers();
		homesRectGroup.clearLayers();
	
		var homePower = Math.floor(Math.log(data.homesize) / Math.LN2);
		var maxClusterZoomUnlimited = mapinfo.maxzoom - (homePower - 3);
		var maxClusterZoomLimitedMax = Math.min(maxClusterZoomUnlimited, mapinfo.maxzoom+1);
		maxZoomForCluster = Math.max(maxClusterZoomLimitedMax, 0);
	
		checkHomeClustering({target: map});

		var sizeHalf = Math.floor(data.homesize / 2);

		$.each( data.homeowners, function( key, val ) {
			var steamid = val.steamid;
			
			var color = "#55ff55";
				
			var pos = L.latLng(val.x, val.z);
			var bounds = L.latLngBounds(L.latLng(val.x - sizeHalf, val.z - sizeHalf), L.latLng(val.x + sizeHalf, val.z + sizeHalf));
			var r = L.rectangle(bounds, {color: color, weight: 1, opacity: 0.8, fillOpacity: 0.15});
			var m = L.marker(pos, { clickable: false, keyboard: false, zIndexOffset:-1000, iconSize: [0,0], icon: L.divIcon({className: 'invisIcon', iconSize:[0,0]}) });
			r.bindPopup("Owner: " + steamid + " <br/>Position: " + val.x + " " + val.y + " " + val.z);
			homesRectGroup.addLayer(r);
			homesClusterGroup.addLayer(m);
			
		});
	}

	var updateHomesEvent = function() {
		var port = location.port;
		port = +port + 1;
		var hostname = location.hostname;
		$.getJSON( "http://" + hostname + ":" + port + "/api/getplayerhomes")
		.done(sethomes)
		.fail(function(jqxhr, textStatus, error) {
			console.log("Error fetching player homes");
		})
	}


	var checkHomeClustering = function(e) {
		if (e.target._zoom >= maxZoomForCluster) {
			homesGroup.removeLayer(homesClusterGroup);	
		} else {
			homesGroup.addLayer(homesClusterGroup);	
		}
	};

	map.on('zoomend', checkHomeClustering);
	
	map.on('overlayadd', function(e) {
		if (e.layer == homesGroup) {
			updateHomesEvent();
		}
	});

	return homesGroup;
}


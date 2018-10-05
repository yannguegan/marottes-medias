
(function() {


// Constants
const testEntity = 'donaldtrump'
const serverUrl = 'https://yannguegan.pythonanywhere.com/marottes/'
const colors = {
	'min': 'rgba(247, 27, 67, 0.8)',
	'max': 'rgba(72, 198, 0, 0.8)',
	'average': 'rgba(0, 0, 0, 0.8)',
	'default' : 'rgb(230,230,230)',
	'hover': 'rgb(150, 150, 150, 0.8)',
	'clicked': [
		'#00aedb',
		'#f47835',
		'#8ec127',
		'#d41243',
		'#a200ff',
	]
}
const widths = {
	'default': 1,
	'highlight': 1,
	'hover': 2,
	'clicked': 3,
}

// DOM variables
let $captions = []

// Other variables
let chart = {}
let context = 'prod'
if (location.hostname === 'localhost') context = 'dev'
let smallDisplay = false;
if (window.innerWidth < 600) smallDisplay = true;

function showMedium(medium, onOff, context) {
	mediumName = _.find(chart.data.info.all,{'code': medium}).name
	mediumConfig = _.find(chart.data.datasets,{'label': mediumName})
	mediumIdx = _.findIndex(chart.data.datasets,{'label': mediumName})

	if (onOff == 'on') {
		if (context == 'clicked' || context == 'initial') {
			let $caption = $captions.filter('[data-medium="' + medium + '"]')
			$caption.addClass('dml-Caption--active')
			let $actives = $('.dml-js-Caption.dml-Caption--active')
			for (i=0; i < $actives.length; i++) {
				$active = $actives.eq(i)
				let activeCode = $active.data('medium') 
				let activeName = _.find(chart.data.info.all,{'code': activeCode}).name
				let activeMedium = _.find(chart.data.datasets,{'label': activeName})
				activeMedium.borderColor = colors.clicked[i]
				activeMedium.pointRadius = 1
				activeMedium.pointBackgroundColor = colors.clicked[i]
				let $activeCaption = $captions.filter('[data-medium="' + activeCode + '"]').css('background-color', colors.clicked[i])
			}
		} else {
			mediumConfig.borderColor = colors[context]
		}
		mediumConfig.borderWidth = widths[context]
	}
	if (onOff == 'off') {
		mediumConfig.borderWidth = widths.default
		mediumConfig.borderColor = colors.default
		mediumConfig.pointBackgroundColor = colors.default
		mediumConfig.pointRadius = 0
		$captions.filter('[data-medium="' + medium + '"]').css('background-color', '').removeClass('dml-Caption--active')
	}

	// Manage lines order
	let keepers = []
	function pushOthers() {
		for (set of chart.data.datasets) {
			if (set.label == mediumName) keepers.push(set)
		}
	}
	function pushCurrent() {
		for (set of chart.data.datasets) {
			if (set.label != mediumName) keepers.push(set)
		}	
	}
	if (onOff == 'off') {
		pushCurrent()
		pushOthers()
	}
	if (onOff == 'on') {
		pushOthers()
		pushCurrent()
	}
	chart.data.datasets = keepers
	chart.update()		
}

function interactions() {
	$captions.off('click')
	$captions.on('click', function() {
		let medium = $(this).data('medium')
		if ($(this).hasClass('dml-Caption--active')) {
			showMedium(medium, 'off')
		} else {
			let nbActive = $('.dml-js-Caption.dml-Caption--active').length
			if (nbActive < 5) {
				showMedium(medium, 'on', 'clicked')
			}
		}
		
	})
	$captions.off('mouseenter')
	$captions.on('mouseenter', function() {
		if ($(this).hasClass('dml-Caption--active') == false) {
			let medium = $(this).data('medium')	
			showMedium(medium, 'on', 'hover')
		}
	})
	$captions.off('mouseleave')
	$captions.on('mouseleave', function() {
		if ($(this).hasClass('dml-Caption--active') == false) {
			let medium = $(this).data('medium')	
			showMedium(medium, 'off')
		}
	})
}
function finishInit() {

	if (smallDisplay) manageOverflow('.dml-js-Captions', 'Voir tous les médias')

	// Add fillers
	for (i=0 ; i<10 ; i++) {
		$('.dml-js-Captions').append('<div class="dml-Caption dml-Caption--filler"></div>')
	}
	$captions = $('.dml-js-Caption:not(.dml-Caption--filler)')

	// Write entity name
	$('.dml-js-EntityName').html(chart.data.info.entity.name)

	// Show first 3

	/*
	if (chart.data.datasets.length >= 4) {
		for (i=1; i<4; i++) {
			let mediumName = chart.data.datasets[i].label
			let mediumCode = _.find(chart.data.info.all, { 'name' : mediumName}).code
			showMedium(mediumCode,'on', 'initial')
		}
	} else {
		let mediumName = chart.data.datasets[1].label
		let mediumCode = _.find(chart.data.info.all, { 'name' : mediumName}).code
		showMedium(mediumCode,'on', 'initial')
	}
	*/

	let mediumName = chart.data.datasets[1].label
	let mediumCode = _.find(chart.data.info.all, { 'name' : mediumName}).code
	showMedium(mediumCode,'on', 'initial')

	interactions()
	hideLoader()
}

function loadData(entity) {
	rqPath = serverUrl + '?entity=' + entity
	dataLoad = $.ajax({
		type: "GET",
  		url: rqPath,
  		cache: false,
  		crossDomain: true,
  		dataType: 'json',
  		contentType: 'application/json; charset=utf-8'
	})
	dataLoad.done(function( data ) {
		let highlights = [ 'dayAverage']
		let hide = ['dayAverageMax', 'dayAverageMin']

		// Change array order
		sortedDatasets = []
		for (dataset of data['datasets']) {
			if (highlights.indexOf(dataset.label) > -1) {
				sortedDatasets.push(dataset)
			}
		}
		for (dataset of data['datasets']) {
			if (highlights.indexOf(dataset.label) == -1 && hide.indexOf(dataset.label) == -1) {
				sortedDatasets.push(dataset)
			}
		}
		data['datasets'] = sortedDatasets

		// Set colors
		for (dataset of data['datasets']) {
			dataset.backgroundColor = 'rgba(0,0,0,0)'
			dataset.borderColor = colors.default
			dataset.borderWidth = widths.default
			dataset.pointBorderWidth = 0
			dataset.pointRadius = 0
			dataset.spanGaps = false
			if (highlights.indexOf(dataset.label) > -1) {
				dataset.borderWidth = widths.highlight
			}
			
			if (dataset.label == 'dayAverage') {
				dataset.label = 'Moyenne'
				dataset.borderColor = colors.average
				dataset.borderDash = [10,5]
			}
			for (xy of dataset['data']) {
				if (xy.x == '') xy.x = null
				if (xy.y == '') xy.y = null
			}
		}

		let ctx = $('.dml-js-Chart')

		if (data.datasets.length >= 2) {
			chart = new Chart(ctx, {
			    type: 'line',
			    data: data,
			    options: {
			    	responsive: true,
			    	maintainAspectRatio: false,
			    	layout: {
			    		padding: 0
			    	},
			    	tooltips: {
			    		enabled: false,
			    	},
			    	legend: {
			    		display: false
			    	},
			    	tooltips: {
			    		enabled: false
			    	},
			        scales: {
			            yAxes: [{
			                ticks: {
			                    min: 0.3,
			                    max:1,
			                    fontFamily: 'Roboto',
			                    fontSize: 13
			                }
			            }],
			            xAxes: [{
			            	type: 'time',
			            	time: {
			            		unit: 'day',
			            		displayFormats: {
			            			day: 'D MMM'
			            		} 
			            	},
			            	ticks: {
			            		fontFamily: 'Roboto',
			                    fontSize: 15,
			                    padding: 7
			            	}
			            }]
			        }
			    }
			})

			setTimeout(function() {
				window.parent.jQuery('.dml-js-Graph').addClass('dml-Graph--loaded')
			}, 300)

			// Add custom captions
			if (context == 'dev') console.log(data)
			let rank = 1
			for (medium of data.info.all) {
				medium['rank'] = rank
				rank += 1
			}
			useHBtemplate(data.info.all, 'caption')
			finishInit()
		} else {
			window.parent.jQuery('.dml-SectionTitle[data-section="evolution"]').addClass('dml--hidden')
		}		
	})
	dataLoad.fail(function( data ) {
		console.log('Failed to load', rqPath)
	})
}
function loadLoader() {
	let loaderLoad = $.ajax({
		type: 'GET',
		url: 'loader.html',
		cache: false,
		dataType: 'html'
	})
	loaderLoad.done(function(data) {
		$('.dml-js-Loader').html(data)
	})
}
function hideLoader() {
	$('.dml-js-Loader').addClass('dml--hidden')
	$('.dml-js-Main').attr('data-loaded', 'oui')

}

// Check if element is overflowing
function checkOverflow(el) {
	var overflowOffset = -10
	var curOverflow = el.style.overflow

	if ( !curOverflow || curOverflow === "visible" )
		el.style.overflow = "hidden";

	var isOverflowing = el.clientWidth < el.scrollWidth
	|| el.clientHeight < (el.scrollHeight + overflowOffset)

	el.style.overflow = curOverflow
	return isOverflowing
}

// Manage element overflow
function manageOverflow(selector, wording) {
	$(selector).each(function() {
		if (checkOverflow(this)) {
			let $this = $(this)
			let $mask = $('<div class="ctx-Mask"></div>')
			let $showMore = $('<div class="ctx-ShowMore">' + wording + '</div>')
			$showMore.click(function() {
				$this.css('max-height', 'none')
				$mask.hide(0)
			})
			$mask.append($showMore)
			$(this).append($mask)

		}
	});
}
$(document).ready(function() {
	loadLoader()
	urlVars = getUrlVars('self')
	let entity = testEntity
	if ('entity' in urlVars) {
		entity = urlVars.entity
	}
	loadData(entity)
}) // End of document.ready
})() // End of wrapping function
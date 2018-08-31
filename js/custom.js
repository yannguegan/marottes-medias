(function() {

// Set here the URL of the dataviz parent when published, use 'none' if not known yet
var prodURL = 'none';

// Main settings for entities list
var nbMediasThreshold = 4
var diffScoreThreshold = 15
var showOnlyThreshold = 0.45
var showMissingThreshold = 0.55

// Other 'global' variables here
var random = parseInt(Math.random() * 1000);
var datavizContent = {};
var URLparameters = {};
var smallDisplay = false;
if (window.innerWidth < 600) smallDisplay = true;
var pyAnyPath = 'https://yannguegan.pythonanywhere.com/data/'
var mediaInfo = {}
var searchURL = 'https://www.google.fr/search?q=site:'
var searchURLtimeParam = '&tbs=qdr:'
var timespans = [
	{ 
		'name': '7days',
		'search': 'w',
		'headerCurrent': 'Depuis 7 jours',
		'headerPrevious': 'Période précédente'
	} 
]

var times = ['previous', 'current']
var searchIndexes = {}
var $sections = []
var $toggles = []
var $timespans = []
var $media = []
var $accordions = []
var $entities = []

function prepareSearch(data, section) {
	if (section == 'entities') searchItem = 'thème'
	if (section == 'media') searchItem = 'média'
	searchBox = '' +
	'<div class="dml-SearchContainer dml-js-SearchContainer">' +
		'<input class="dml-js-Search dml-Search dml--masked" type="text" placeholder="Chercher un ' + searchItem + '" />' +
		'<div class="dml-NoResults dml-js-NoResults dml--hidden">Désolé&nbsp;! Il n’y a aucun résultat pour cette recherche</div>' + 
  	'</div>'
	$section = $sections.filter('[data-section="' + section + '"]')
	$section.prepend(searchBox)

	// Create search index
    searchIndexes[section] = elasticlunr(function () {
		this.use(elasticlunr.fr)
		this.setRef('code')
	});
	searchIndexes[section].addField('name') 
	for (item of data) {
		var doc = {
			'code': item['code'],
			'name': removeDiacritics(item['name'])
		}
		searchIndexes[section].addDoc(doc)
	}

	$section.find('.dml-js-Search').removeClass('dml--masked')
}
function loadEntities() {

	analyzesURL = pyAnyPath + 'dml-marottes/data.json'
	// analyzesURL = 'data.json'
	analyzesLoad = $.ajax({
		type: "GET",
  		url: analyzesURL,
  		cache: false,
  		crossDomain: true,
  		dataType: 'json',
  		contentType: 'application/json; charset=utf-8'
	})
	analyzesLoad.done(function( data ) {

		datavizContent = data

		// Write last analyse date		
		for (medium in data['7days'].media) {
			lastAnalyse = new Date(data['7days'].media[medium].analyse.lastAnalyse)

    		$('.dml-js-LastAnalyse').html(lastAnalyse.toLocaleDateString('fr-FR',{'weekday':'long', 'month': 'long', 'day': 'numeric'}))
    		break
		}

		filteredData = {
			'7days': {
				'entities': []
			}
		}
		for (entity of data['7days'].entities) {
			if (entity['mediaCount'] >= nbMediasThreshold) {
				filteredData['7days'].entities.push(entity)
			} 

		}

		// Write entities list
		useHBtemplate(filteredData, 'entities')

		$('.dml-js-ScoreMin').html('<' + datavizContent['7days'].analyse.relevanceThreshold)

		// Prepare search engine
		prepareSearch(data['7days'].entities, 'entities')

		$('.dml-js-Section[data-section="entities"]').addClass('dml-Section--ready')

		$accordions = $('.dml-js-Accordion')
		$entities = $('.dml-js-Entity')

		// Load media for initial entity 
		firstEntityCode = $entities.first().data('entity')
		initialEntity = firstEntityCode
		if ('entity' in URLparameters) {
			$entityInUrl = $entities.filter('[data-entity="' + URLparameters.entity + '"]')
			if ($entityInUrl.length > 0) {
				initialEntity = URLparameters.entity
			}
		} 
		loadEntityMedia(initialEntity)
		$initialEntity = $entities.filter('[data-entity="' + initialEntity + '"]')
		$accordion = $initialEntity.find('.dml-js-Accordion')
		toggleAccordion($accordion)
		

		// Ready to show content
		showTimespan('7days')
		showSection('entities')

		// Scroll to entity in URL
		if (initialEntity != firstEntityCode) {
			let pos = $initialEntity.offset().top
			pos += getIframePosition()
			setTimeout(function() {
				window.parent.jQuery('html, body').animate({
	       			 scrollTop: pos - 350
	   			 }, 500);
			},500)
		}

		interactions()
		setTimeout(function() {
			window.parent.jQuery('.dml-js-Dataviz').css('opacity', 1)
        	window.parent.jQuery('.dml-js-Loader').css('display', 'none')
		}, 300)
	})
	analyzesLoad.fail(function( data ) {
		console.log('Failed to load', analyzesURL )
	})
}

function loadMedia(data) {

	// Store matching entities for each media
	for (entity of data.entities) {
		entity.allMedia = []
		for (medium of entity.media) {
			entity.allMedia.push(medium.code)
			if (typeof data.media[medium.code].entities == 'undefined') {
				data.media[medium.code].entities = []
			}
			mediumEntity = {
				'relevance': medium.relevance,
				'previousRelevance': medium.previousRelevance,
				'spreadRelevance': medium.spreadRelevance,
				'searchURL': medium.searchURL,
				'name': entity.name,
				'previousRelevanceEvol': medium.previousRelevanceEvol,
				'code': entity.code,
				'spreadAverageType': medium.spreadAverageType,
				'spreadAverage': medium.spreadAverage,
				'mediaCount': entity.mediaCount,
				'averageRelevance': entity.averageRelevance
			}
			data.media[medium.code].entities.push(mediumEntity)
		} 
		data.media[medium.code]['nbEntities'] = data.media[medium.code].entities.length
	}

	// Remove media without any entity detected
	toRemove = []
	for (medium in data.media) {
		if (typeof data.media[medium].entities == 'undefined') {
			toRemove.push(medium)
		}
	}

	for (medium of toRemove) {
		delete data.media[medium]
	}

	// Add category for each entity in each medium
	for (medium in data.media) {
		for (entity of data.media[medium].entities) {
			entity.category = 'none'
			if (entity.spreadAverageType == 'more' && entity.spreadAverage > diffScoreThreshold) entity.category = 'more'

			if (entity.spreadAverageType == 'less' && (0 - entity.spreadAverage) < (0 - diffScoreThreshold)) {
				entity.category = 'less'
			}
			if (entity.mediaCount == 1 && entity.relevance >= showOnlyThreshold) { 
				entity.category = 'only'
			}
		}
	}

	// Add entities not found for media ('missing' section)
	for (medium in data.media) {
		code = data.media[medium].code
		// console.log('')
		// console.log(code)
		for (entity of data.entities) {
			if (jQuery.inArray(code, entity.allMedia) == -1 && entity.mediaCount >= nbMediasThreshold && entity.averageRelevance >= showMissingThreshold) {
				// console.log(entity.code)
				mediumEntity = {
					'relevance': '<' + datavizContent['7days'].analyse.relevanceThreshold,
					'previousRelevance': '-',
					'spreadRelevance': '-',
					'searchURL': medium.searchURL,
					'name': entity.name,
					'previousRelevanceEvol': '-',
					'code': entity.code,
					'spreadAverageType': 'less',
					'spreadAverage': -100,
					'mediaCount': entity.mediaCount,
					'averageRelevance': entity.averageRelevance,
					'category': 'less'
				}
				data.media[code].entities.push(mediumEntity)
			}
		}
	} 
	
	// Sort entities by spread from average
	function sortEntities(a, b){
  		a = a.spreadAverage
  		b = b.spreadAverage
  		return b - a
	}

	for (medium in data.media) {
		data.media[medium].entities.sort(sortEntities)
	}

	// Make array with results to sort it
	mediaArr = []
	for (medium in data.media) {
		mediaArr.push(data.media[medium])
	}

	// Sort media by entities count
	function sortMedia(a, b){
  		a = a.nbEntities
  		b = b.nbEntities
  		return b - a
	}
	mediaArr.sort(sortMedia)
	data.media = mediaArr

	// Write media list
	useHBtemplate(data, 'media')

	// Prepare search
	prepareSearch(data.media, 'media')

	// Finish preparing entites sections
	$header = $('.dml-js-Entity').find('.dml-js-SectionHeaders').html()
	$media = $('.dml-js-Medium')
	$accordions = $('.dml-js-Accordion')

	// Load entities for first medium
	$firstMedium = $media.first()
	firstMediumCode = $firstMedium.data('medium')
	$accordion = $firstMedium.find('.dml-js-Accordion')
	loadMediumEntities(firstMediumCode)
	toggleAccordion($accordion)

	interactions()

	// Mark section as ready
	$('.dml-js-Section[data-section="media"]').addClass('dml-Section--ready')
}

function loadEntityMedia(code) {
	$entity = $entities.filter('[data-entity="' + code + '"]')
	$entityMediaList = $entity.find('.dml-js-EntityMedia')
	data = {}

	// Look for media 
	for (entity of datavizContent['7days']['entities']) {
		if (entity.code == code) data = entity
	}
	
	useHBtemplate(data, 'entity_media')
	$entity.addClass('dml-Entity--mediaLoaded')

	// Load graph
	if (smallDisplay == false) {
		file = 'graph.html?entity=' + code
		$entity.find('.dml-js-Graph').html('' +
		'<iframe class="dml-Graph-iframe dml-js-GraphIframe" style="width: 1px; min-width: 100%; height: 75px;" frameborder="no scrolling="no" src="' + file + '"></iframe>').removeClass('dml--hidden')
		$graphIframe = $entity.find('.dml-js-GraphIframe')
		$graphIframe.iFrameResize()
	}

}
function loadMediumEntities(code) {

	initialSource = $('script[type="text/x-handlebars-template"][data-template="medium_entities"]').html()
	dataMedia = datavizContent['7days']['media']
	data = {}
	for (dataMedium of dataMedia) {
		if (dataMedium['code'] == code) data = dataMedium
	}

	$medium = $media.filter('[data-medium="' + code + '"]')
	$mediumEntitiesLists = $medium.find('.dml-js-EntitiesSection')
	$mediumEntitiesLists.each(function() {
		section = $(this).data('section')
		source = '' +
        '{{#each entities}}' +
        '{{#ifCond category "==" "' + section + '"}}' +
        initialSource +
        '{{/ifCond}}' +
        '{{/each}}'
        template = Handlebars.compile(source)
        html = template(data)
        $(this).find('.dml-js-SectionList').html(html)
    })

	$mediumEntitiesLists.each(function() {
		section = $(this).data('section')

		// Hide entity section if empty
		if ($('.dml-js-MediumEntity', this).length == 0) {
		  $(this).addClass('dml--hidden')
		} else {

			// Add filler div for better alignment
			if (section == 'missing' || section == 'only') {
				for (i=0 ; i<3 ; i++) {
					$('.dml-js-SectionList', this).append('<div class="dml-Entity dml-Entity--spacer"></div>')
				}
			}

			// Add header to entity list
			$('.dml-js-SectionHeaders', this).prepend($header)
		}
	})

	// Mark medium as ready
	$medium.addClass('dml-Medium--entitiesLoaded')

}

function showTimespan(timespan) {

	// Mark related toggle as active
	$toggles.removeClass('dml-Toggles-Toggle--active')
	$toggles.filter('[data-timespan="' + timespan + '"]').addClass('dml-Toggles-Toggle--active')

	// Show related section
	$timespans.addClass('dml--hidden')
	$timespans.filter('[data-timespan="' + timespan + '"]').removeClass('dml--hidden')
}
function showSection(section) {

	// Mark related tab as active
	$tabs.removeClass('dml-Tabs-tab--selected')
	$tabs.filter('[data-section="' + section + '"]').addClass('dml-Tabs-tab--selected')

	// Show related section
	$sections.addClass('dml--hidden')
	$sections.filter('[data-section="' + section + '"]').removeClass('dml--hidden')

	// Load media list 
	if (section == 'media' && $('.dml-js-Section[data-section="media"]').hasClass('dml-Section--ready') == false) loadMedia(datavizContent['7days'])
}
function toggleAccordion($accordion, openClose) {

	if (typeof openClose == 'undefined') {
		if ($accordion.hasClass('dml-Accordion--closed')) {
			$accordion.next().removeClass('dml-Accordion-content--closed')
			$accordion.removeClass('dml-Accordion--closed')	
		} else {
			$accordion.next().addClass('dml-Accordion-content--closed')
			$accordion.addClass('dml-Accordion--closed')	
		}
	} else {
		if (openClose == 'open') {
			$accordion.next().removeClass('dml-Accordion-content--closed')
			$accordion.removeClass('dml-Accordion--closed')	
		}
		if (openClose == 'close') {
			$accordion.next().addClass('dml-Accordion-content--closed')
			$accordion.addClass('dml-Accordion--closed')				
		}
	}

}
function interactions() {

	//
	// Click on a tab
	$tabs.off('click')
	$tabs.on('click', function() {
		section = $(this).data('section')
		showSection(section)
	})

	// Click on a toggle
	$toggles.off('click')
	$toggles.on('click', function() {
		timespan = $(this).data('timespan')
		showTimespan(timespan)
	})

	// Click on a Accordion


	$accordions.off('click')
	$accordions.on('click', function() {

		// Open/close Accordion
		$accordion = $(this)
		toggleAccordion($accordion)

		section = $(this).parents('.dml-js-Section').data('section')
		eventCode = ''
		if (section == 'entities' && $(this).parents('.dml-js-Entity').hasClass('dml-Entity--mediaLoaded') == false) {

			// Load entity media list
			entityCode = $(this).parents('.dml-js-Entity').data('entity')
			loadEntityMedia(entityCode)
			eventCode = entityCode			

		}
		if (section == 'media' && $(this).parents('.dml-js-Medium').hasClass('dml-Medium--entitiesLoaded') == false) {
			mediumCode = $(this).parents('.dml-js-Medium').data('medium')

			eventCode = mediumCode
			// Load media entities list
			loadMediumEntities(mediumCode)
		}

		// Change URL
		if (section == 'entities' && $(this).hasClass('dml-Accordion--closed') == false) {
			console.log('clic')
			let entityCode = $(this).parents('.dml-js-Entity').data('entity')
			let currentUrl = window.parent.location.href
			let newUrl = setParameter(currentUrl, 'entity', entityCode)
			window.top.history.pushState('',window.top.title,newUrl)
		}

		// GA event
		gtag('event', 'open_' + eventCode, {
			'event_category': 'accordion_' + section,
			'event_label': 'keyboard'
		})
	})

	// Delaying search after user has finished typing
	var delay = (function(){
		var timer = 0;
		return function(callback, ms){
			clearTimeout (timer)
			timer = setTimeout(callback, ms)
		};
	})();


	// Text search	
	$('.dml-js-Search:not(.dml--masked)').off( 'keyup')
	$('.dml-js-Search:not(.dml--masked)').on( 'keyup', function () {
		$this = $(this)
		delay(function() {
			timespan = $this.parents('.dml-js-Timespan').data('timespan')
			section = $this.parents('.dml-js-Section').data('section')
			$noresults = $this.parents('.dml-js-SearchContainer').find('.dml-js-NoResults')
			if (section == 'entities') {
				itemType = 'entity'
				itemSelector = '.dml-js-Entity'
			}
			if (section == 'media') {
				itemType = 'medium'
				itemSelector = '.dml-js-Medium:not(.dml-Medium--empty)'
			}
			$allItems = $('.dml-js-Timespan[data-timespan="' + timespan + '"] ' + itemSelector)
			term = $this.val()
			term = removeDiacritics(term)
			if (term.length >= 3) {

				// String in search field is long enough, perform search
				results = searchIndexes[section].search(term, {
					expand: true,
					bool: 'AND'
				})

				// Show matching elements
				$allItems.addClass('dml--hidden')
				for (result of results) {
					$allItems.filter('[data-' + itemType + '="' + result.ref + '"]').removeClass('dml--hidden')
					if (itemType == 'entity') {
						if ($entities.filter('[data-entity="' + result.ref + '"]').hasClass('dml-Entity--mediaLoaded') == false) {
							loadEntityMedia(result.ref)
						}
					}
					if (itemType == 'medium') {
						if ($media.filter('[data-medium="' + result.ref + '"]').hasClass('dml-Medium--entitiesLoaded') == false) {
							loadMediumEntities(result.ref)
						}
					}
					$accordion = $allItems.filter('[data-' + itemType + '="' + result['ref'] + '"]').find('.dml-js-Accordion')
					toggleAccordion($accordion, 'open')
				}

				// Show 'no result message' if no results
				if (results.length == 0) {
					$noresults.removeClass('dml--hidden')
				} else {
					$noresults.addClass('dml--hidden')
				}

			} else {

				// String in search field is too small, show everything
				$allItems.removeClass('dml--hidden')
				$noresults.addClass('dml--hidden')
				$accordions.each(function() {
					toggleAccordion($(this), 'close')
				})
			}
		}, 300)
	})

	// Events when scrolling (with throttle)
	$(window.parent.document).scroll(throttle(function(event) {
		var y = window.parent.scrollY

		// Show/hide back to top buttons
		if (y > getIframePosition() && y < (getIframePosition() + 500 + $('body').height() - window.parent.innerHeight)) {
			window.parent.jQuery('.dml-js-BackToTop').css('display', 'block');
		} else {
			window.parent.jQuery('.dml-js-BackToTop').css('display', 'none');
		}
	}));


	// Click on back to top button
  	window.parent.jQuery('.dml-js-BackToTop').click(function() {
  		headerHeight = window.parent.jQuery('header').height() 
    	window.parent.jQuery('body, html').animate({
    		scrollTop: getIframePosition() - headerHeight - 10
    		}, 600)
  		})

}
$(document).ready(function() {

	// Redirecting if page is not loaded inside iframe
  	if ((inIframe() != true) && (prodURL != 'none') ) window.open(prodURL, '_self');
	URLparameters = getUrlVars('parent')

	// DOM variables
	$sections = $('.dml-js-Section')
	$timespans = $('.dml-js-Timespan')
	$tabs = $('.dml-js-Tab')
	$toggles = $('.dml-js-Toggle')
	loadEntities()

	$('.dml-js-ToParent').each(function() {
		writeInParent(this)
	})

	// Only on mobile
	if (smallDisplay) {

		// Event on slide change
	
	}

}) // End of document.ready
})() // End of wrapping function

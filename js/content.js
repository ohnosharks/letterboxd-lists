function executeOnPageSpace(code){
	// create a script tag
	var script = document.createElement('script')
	script.id = 'tmpScript'
	// place the code inside the script. later replace it with execution result.
	script.textContent = 
	'document.getElementById("tmpScript").textContent = JSON.stringify(' + code + ')'
	// attach the script to page
	document.documentElement.appendChild(script)
	// collect execution results
	let result = document.getElementById("tmpScript").textContent
	// remove script from page
	script.remove()
	// return JSON.parse(result)
}
  




if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded',afterDOMLoaded);

} else {
    // simplifyPosterLinks()

	// Create the settings filter menu
	if( !$(".filter-menu").length ){
		$.get(chrome.runtime.getURL('/filtermenu.html'), function(data) {
			$(".sidebar .section.poster-list").after(data)

			var $filterMenu = $(".filter-menu")
			
			// Make it sticky lol
			document.addEventListener('scroll', function(e){
				if( $(document).scrollTop() > 475 ){
					$filterMenu.addClass('sticky')
				} else {
					$filterMenu.removeClass('sticky')
				}
			})

			// Get settings
			const getSettings = browser.storage.local.get()
			getSettings.then(restoreSettings, onError)

			filterCount()
		});
	}




}


// var perfEntries = performance.getEntriesByType("navigation");
// for (var i = 0; i < perfEntries.length; i++) {
//     console.log(perfEntries[i].type);
// }




// Make settings and stuff

// Default settings
let settings = {
	'filtersEnabled': false,
	'fadeFiltered': false, 
	'filterOptions': [
		{
			'name': 'maxCount',
			'enabled': false,
			'value': 200
		},
		{
			'name': 'minCount',
			'enabled': false,
			'value': 3
		},
		{
			'name': 'maxLikes',
			'enabled': false,
			'value': 500
		},
		{
			'name': 'minLikes',
			'enabled': false,
			'value': 0
		},
		{
			'name': 'filterKeywords',
			'enabled': false,
			'value': [] // strings, case insensitive, whole words
		},
		{
			'name': 'blacklistIds',
			'enabled': false,
			'value': [] // takes objects – {id, name}
		},
		{
			'name': 'whitelistIds',
			'enabled': false,
			'value': [] // takes objects – {id, name}
		}
	]
}


function storeSettings(){
	browser.storage.local.set(settings)
}
// storeSettings()



function restoreSettings(savedSettings) {
	// usernameInput.value = savedSettings.authCredentials.username || "";
	if( savedSettings.filtersEnabled !== undefined ){
		// console.log('saved',savedSettings)
		// set settings from saved
		settings = savedSettings
	} else {
		// Set default settings
		browser.storage.local.set(settings);
	}

	// Apply settings
	$(".filter-menu .enable-filters").attr('checked', savedSettings.filtersEnabled)
	if( savedSettings.filtersEnabled ){
		enableFilters()
	}

	// if fade filtered
	if( savedSettings.fadeFiltered ){
		$(".list-set").addClass('fade-filtered')
		$("input.fade-filtered").attr('checked',true)
	}

	// Loop through options and apply 
	settings.filterOptions.forEach(opt => {
		let $group = $(`.filter-option-group[data-name="${opt.name}"]`)
		// set checkbox enabled
		if(opt.enabled){
			$group.find('input[type="checkbox"]').attr('checked',true)
			$group.addClass('active')
			setTimeout(function(){
				$group.find('.options').css('height', $group.find('.options')[0].scrollHeight +'px' )
			}, 100)
		}
		// int values
		$group.find('input.int-value').val(opt.value)
		// keywords
		if(opt.name == 'filterKeywords'){
			var $ul = $group.find('ul')
			opt.value.forEach(k => {
				$ul.append('<li>'+k+'</li>')
			})
		}
	})

}

function onError(error){
	console.log(error)
}


// Click to enable
$("body").on('change', '.filter-menu input.enable-filters', function(){
	let isEnabled = $(this).is(':checked') ? true : false
	settings.filtersEnabled = isEnabled
	storeSettings()
	if(isEnabled){
		enableFilters()
	} else {
		disableFilters()
	}
})


// Set fading option
$("body").on('change', '.filter-menu input.fade-filtered', function(){
	let isEnabled = $(this).is(':checked') ? true : false
	settings.fadeFiltered = isEnabled
	storeSettings()

	// Set class on entire list set to override or whatever
	if(isEnabled){
		$(".list-set").addClass('fade-filtered')
	} else {
		$(".list-set").removeClass('fade-filtered')
	}
})



// Enable filters
function enableFilters(){
	// Do the whole thing when filters are enabled
	$(".filter-options").addClass('active')

	// These filters:
	// console.log('these',settings)
	applyFilters()
}

function disableFilters(){
	$(".filter-options").removeClass('active')
	$("section.list").removeClass('filtered')
	filterCount()
}



// Enable/disable individual option groups
$("body").on('change', '.filter-option-group input[type="checkbox"]', function(){
	let isEnabled = $(this).is(':checked') ? true : false
	let optName = $(this).closest('.filter-option-group').attr('data-name')

	var $group = $(this).closest('.filter-option-group')

	if(isEnabled){
		$group.addClass('active')
		$group.find('.options').css('height', $group.find('.options')[0].scrollHeight +'px' )
	} else {
		$group.removeClass('active')
		$group.find('.options').css('height', '0px' )
	}

	// Set enable/disable in settings array
	settings.filterOptions.forEach((opt,index) => {
		if( opt.name == optName ){
			settings.filterOptions[index].enabled = isEnabled
		}
	})

	// Save settings array
	storeSettings()
	applyFilters()
})


// Change value for option groups
$("body").on('keydown blur', '.filter-option-group input.int-value', function(e){
	if(e.originalEvent.code=='Enter' || e.type == 'focusout'){
		// console.log('d oi itttt')
		// Get the value + int parse it
		var v = parseInt($(this).val())
		$(this).val(v)
		// Get option name
		let optName = $(this).closest('.filter-option-group').attr('data-name')
		// Set enable/disable in settings array
		settings.filterOptions.forEach((opt,index) => {
			if( opt.name == optName ){
				settings.filterOptions[index].value = v
			}
		})

		// Save settings array
		storeSettings()
		applyFilters()
	}
})


// Add keyword to keyword filters
$("body").on('keydown', '.filter-option-group[data-name="filterKeywords"] input.field', function(e){
	if(e.originalEvent.code=='Enter'){
		var k = $(this).val()
		settings.filterOptions.forEach((opt,index) => {
			if( opt.name == 'filterKeywords' ){
				// Get existing array
				settings.filterOptions[index].value.push(k)
				var $group = $(this).closest('.filter-option-group')
				$group.find('ul').append('<li>'+k+'</li>')
				$group.find('.options').css('height', $group.find('.options')[0].scrollHeight +'px' )
			}
		})
		$(this).val('')
		storeSettings()
		applyFilters()
	}
})

// Remove keyword filters
$("body").on('click', '.filter-option-group[data-name="filterKeywords"] ul li', function(e){
	var k = $(this).text()

	settings.filterOptions.forEach((opt,index) => {
		if( opt.name == 'filterKeywords' ){
			// Get existing array
			var prevArray = settings.filterOptions[index].value
			var newArray = prevArray.filter(e => e !== k)
			settings.filterOptions[index].value = newArray
		}
	})
	$(this).remove()
	storeSettings()
	applyFilters()
})








// Scrape page
function getPage(uri, callback){
	var pageUrl = "https://letterboxd.com" + uri;
	// var pageNo = pageUrl.slice(0, -1).split('/').pop()
	var request = new XMLHttpRequest();
	request.open('GET', pageUrl, true);
	request.onload = function() {
		if (request.status >= 200 && request.status < 400) {
			callback(request.responseText);
			history.replaceState('', '', pageUrl);
		} else {
			callback(false);
		}
	};
	request.onerror = function() {
		callback(false)
	};
	request.send();
}


// Receive scraped page
function gotPage(html) {
    if (html !== false) {
		// console.log(html)
		grabLists(html)

		// check if pagination more button
		var $next = $($.parseHTML(html)).find('a.next');
		if(!$next.length){
			$("a.next").remove()
		} else {
			$("a.next").attr('href', $next.attr('href'))
			$("a.next").removeClass('loading').text('Load more')
		}
    }
}

function gotPrevPage(html) {
    if (html !== false) {
		// console.log(html)
		grabLists(html)

		// check if pagination more button
		var $next = $($.parseHTML(html)).find('a.previous');
		if(!$next.length){
			$("a.previous").remove()
		} else {
			$("a.previous").attr('href', $next.attr('href'))
			$("a.previous").removeClass('loading').text('Load previous')
		}
    }
}




// Load more button
if( $("a.next").length ){
	$("a.next").text('Load more')
}


// Add visible display next to load button
var $display = $('<div>').addClass('filter-display')
$display.html('Showing <span class="showing-count"></span> of <span class="total-count"></span> loaded lists (<span><span class="hidden-count"></span> hidden</span>)')
$(".pagination").prepend($display)


// Click to load more
$("body").on('click', 'a.next', function(e){
	e.preventDefault()
	if( !$(this).hasClass('loading') ){
		let next = $("a.next").attr('href')
		let hrefSplit = next.split('/')
		// console.log(hrefSplit)
		let l = hrefSplit.length
		let pageNo = hrefSplit[l-2]
		// console.log(pageNo)
		$(this).text('Loading page '+pageNo)
		$(this).addClass('loading')
		// chrome.runtime.sendMessage({pageUrl: next}, gotPage);
		getPage(next, gotPage)
	}
})


// Prev pages thing
if( $("a.previous").length ){
	$("a.previous").text('Load previous')
	$("a.previous").parent().appendTo($("a.previous").closest('.pagination'))
}

// Click to load previous
$("body").on('click', 'a.previous', function(e){
	e.preventDefault()
	if( !$(this).hasClass('loading') ){
		let next = $("a.previous").attr('href')
		let hrefSplit = next.split('/')
		// console.log(hrefSplit)
		let l = hrefSplit.length
		let pageNo = hrefSplit[l-2]
		// console.log(pageNo)
		if(Number.isInteger(parseInt(pageNo))){
			$(this).text('Loading page '+pageNo)
		} else {
			$(this).text('Loading page 1')
		}
		$(this).addClass('loading')
		// chrome.runtime.sendMessage({pageUrl: next}, gotPage);
		getPage(next, gotPrevPage)
	}
})





// applyFilters()







function grabLists(html){

    var lists = [];

    var $listElements = $($.parseHTML(html)).find('section.list');

	// do some filtering here


	// parse some elements
	// Make template of list item
	var $template = $("section.list").first()
	var $iconLike = $template.find('.icon-like span.icon')
	var $iconComment = $template.find('.icon-comment span.icon')


	// filter the returned html list
	var $filteredList = applyFilters($listElements)

	// visible count
	var visible = 12

	// append lists
	$filteredList.each(function(){
		
		// add correct icons
		$(this).find('a.icon-like').prepend( $iconLike.clone() )
		$(this).find('a.icon-comment').prepend( $iconComment.clone() )

		// append the item
		$("section.list-set .pagination").before($(this))
		
		// count
		if( $(this).hasClass('filtered') ){
			visible--
		}
	})

	// Lazy load posters plz
	executeOnPageSpace(`window.bxd.loadReallyLazyPosters($(".really-lazy-load"))`)


	// count filtered items in this batch
	if( visible < 1){ // means if batch is empty, get next
		setTimeout(function(){
			$("a.next").click()
			// console.log('click', $("a.next").attr('href') )
		}, 50)
	}

}



// Apply filters
function applyFilters($list = undefined){

	// Use passed object or use html on page
	if($list == undefined){
		$subject = $("section.list")
	} else {
		$subject = $list
	}

	// Check for filters
	if( settings.filtersEnabled ){
		// console.log('filters enabled')

		// reset
		$subject.removeClass('filtered')

		// Go through the filters
		settings.filterOptions.forEach(opt => {
			if(opt.enabled){
				// console.log('filter:',opt.name)
				switch(opt.name){

					// Max count thing
					case 'maxCount':
						// Apply per item
						$subject.each(function(){
							// get number of films
							var count = $(this).find('p.attribution small.value').text()
							var count = count.replace(',', '')
							var countInt = parseInt(count.replace(' films', ''))

							// Hide films above count
							if( countInt > opt.value ){
								$(this).addClass('filtered')
							}
						})
					break;

					// Minimum count
					case 'minCount':
						// Apply per item
						$subject.each(function(){
							// get number of films
							var count = $(this).find('p.attribution small.value').text()
							var count = count.replace(',', '')
							var countInt = parseInt(count.replace(' films', ''))

							// Hide films above count
							if( countInt < opt.value ){
								$(this).addClass('filtered')
							}
						})
					break;


					// Keyword filters
					case 'filterKeywords':
						// Apply per item (if there are keywords)
						if( opt.value.length > 0 ){
							$subject.each(function(){
								// get list title
								var title = $(this).find('.title-2').text()
	
								// loop through keywords
								for (let i = 0; i < opt.value.length; i++) {
									const k = opt.value[i];
									// console.log(k)
									// get match
									var match = new RegExp("\\b" + k + "\\b","i").test(title)
									if(match){
										$(this).addClass('filtered')
										break;
									}
								}
	
								// opt.value.forEach(k => {
	
								// })
	
								// // Hide films above count
								// if( countInt < opt.value ){
								// 	$(this).addClass('filtered')
								// }
							})
						}
					break;


				} //endswitch
			}
		})

	}



	// do total count for display
	setTimeout(function(){
		filterCount()
	}, 100)



	// Return filtered element if we need that
	if($list !== undefined){
		return $list
	}


	// var maxCount = 300;

	// // Apply per item
	// $("section.list").each(function(){

	// 	// get number of films
	// 	var count = $(this).find('p.attribution small.value').text()
	// 	var count = count.replace(',', '')
	// 	var countInt = parseInt(count.replace(' films', ''))

	// 	// Hide films above count
	// 	if( countInt > maxCount ){
	// 		$(this).addClass('filtered')
	// 	}

	// })


	// // // if too few visible
	// console.log('addCount', addCount)
	// if( $("section.list:not(.filtered)").length < addCount ){
	// // if( addCount > 0 ){
	// 	console.log('too few')
	// 	setTimeout(function(){
	// 		$("a.next").click()
	// 		console.log('click', $("a.next").attr('href') )
	// 	}, 50)
	// } else {

	// }



}






// count visible to display in the bottom bar thing plz thnak you
function filterCount(){
	var totalCount = $("section.list").length
	var totalVisibleCount = $("section.list:not(.filtered)").length

	$('.filter-display span.showing-count').text(totalVisibleCount)
	$('.filter-display span.total-count').text(totalCount)
	$('.filter-display span.hidden-count').text(totalCount - totalVisibleCount)
}
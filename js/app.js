/**
 * Основной модуль проекта.
 */
jQuery(function ($) {
	'use strict';
	
	// Коды кнопок вынесены отдельно. Этого можно не делать, если подключается jQuery.ui
	var key = {
		LEFT: 37,
		RIGHT: 39,
		HOME: 36,
		END: 35,
		ENTER: 13,
		BACKSPACE: 8,
		DELETE: 46,
		A: 65,
		ESC: 27,
		TAB: 9
	};
	
	/**
	 * Данные приложения.
	 * В идеале желательно выделить в отдельный файл и функцию получения данных (get) переписать как асинхронную
	 * через параметр-коллбэк или jQuery Deferred.
	 */
	var Model = {
		presentations: [{
			id: 543,
			slidesCount: 12,
			name: 'Facebook',
			description: 'Discover Facebook\'s extraordinary talent in tackling five classic startup challenges: Technology & User Experience, Business Model Exploration, Business & Ecosystem, Facing mobile disruption, Long-term vision. '
		}, {
			id: 980,
			slidesCount: 5,
			name: 'Awesome',
			description: 'Tips for creating great visuals. Includes: Colour, font and image use. '
		}],
		
		get: function(presentationId) {
			for(var i in this.presentations) {
				if (this.presentations[i].id == presentationId) return this.presentations[i];
			}
			return false;
		},
		
		/**
		 *  Получение пути к картинке
		 */
		slideUrlGet: function(presentationId, slideNumber, size) {
			$.inArray(size, ['big','small']) === -1 && (size = 'big');
			return '/presentation/'+presentationId+'/slide-'+slideNumber+'-'+size+'.jpg';
		}
	};
	
	/**
	 * Обработка запросов приложения.
	 * При старте приложения нужно вызвать Router.start() и обработать изменение урла, повесив обработку на Router.on('action')
	 */
	var Router = {
			
		currentHash: undefined,
		
		/**
		 * Вся обработка событий ведетия через этот объект. 
		 */
		eventHandler: $('<div></div>'),
		
		start: function() {
			setInterval($.proxy(function() {
				window.location.hash !== this.currentHash && this.onHashChanged();
			}, this), 100);		
		},
		
		onHashChanged: function() {
			this.currentHash = window.location.hash;
			var url = this.currentHash.replace('#', '').split('/');
			var action = url.splice(0,1);
			this.trigger('action', {
				name: action.length ? action[0] : false,
				args: url
			});
		},

		/**
		 * Алиас для jQuery trigger. 
		 */
		trigger: function() {
			this.eventHandler.trigger.apply(this.eventHandler, arguments);
		},
		
		/**
		 * Алиас для jQuery on.
		 */
		on: function() {
			this.eventHandler.on.apply(this.eventHandler, arguments);
		},
		
		redirect: function(pageUrl) {
			window.location.hash = '#' + pageUrl;
		}
		
	};
	
	/**
	 * Дополнительные полезные функции системы.
	 */
	var Utils = {
		keyCodeIsNumber: function(keycode) {
			return (keycode < 48 || keycode > 57) && (keycode < 96 || keycode > 105 );
		}
	};
	
	/**
	 * Собственно наше приложение.
	 */
	var App = {
			
		/**
		 * Скомпиленные шаблоны.
		 */
		templates: {},
		
		/**
		 * Инициализация, вызывается при старте системы однократно.
		 */
		init: function (route) {
			this.compileTemplates();
			Router.on('action', $.proxy(function(event, options) {
				switch(options.name) {
					case 'item':
						this.item.apply(this, options.args);
						break;
					default:
						this.main();
				}
			}, this));
			Router.start();
		},
		
		/**
		 * Страница со списком презентаций
		 */
		main: function() {
			this.render('body', 'layout', {
				models: Model.presentations
			});
		},
		
		/**
		 * Страница с просмотром одной презентации.
		 */
		item: function(presentationId, page) {
			var presentationData = presentationId ? Model.get(presentationId) : false;
			if (!presentationData) {
				Router.redirect('main');
				return;
			}
			
			page = isNaN(page) ? 1 : +page;
			if (page < 1 || page > presentationData.slidesCount) {
				Router.redirect('item/'+presentationId+'/1');
				return;
			}
			
			this.render('body', 'item', {
				data: presentationData,
				page: page
			});
			
			// Страница вставлена в DOM, навешиваем события:
			
			var pageInput = $('#page');
			
			// Навигация в инпуте
			pageInput.keydown(function(event) {
				if ( $.inArray(event.keyCode, [key.BACKSPACE, key.DELETE, key.ESC, key.TAB, key.LEFT, key.RIGHT, key.HOME, key.END]) !== -1 ) {
					return;
		        } 
				if (event.keyCode == key.ENTER) {
					Router.redirect('item/'+presentationId+'/'+this.value);
					return
		        }
	            if (event.shiftKey || Utils.keyCodeIsNumber(event.keyCode)) {
	                event.preventDefault(); 
	            }   
			}).blur(function() {
				Router.redirect('item/'+presentationId+'/'+this.value);
			});
			
			// Навигация при нажатии стрелок на документе
			$(document).off('keydown').keydown(function(event) {
				if ( $.inArray(event.keyCode, [key.LEFT, key.RIGHT, key.HOME, key.END]) === -1) {
					return;
				}
				if (event.target == pageInput[0]) return;
				if (event.keyCode == key.LEFT || event.keyCode == key.HOME) {
					if (page == 1) return;
					Router.redirect('item/'+presentationId+'/'+(event.keyCode == key.LEFT ? page-1 : 1));
				}
				if (event.keyCode == key.RIGHT || event.keyCode == key.END) {
					if (page == presentationData.slidesCount) return;
					Router.redirect('item/'+presentationId+'/'+(event.keyCode == key.RIGHT ? page+1 : presentationData.slidesCount));
				}
			});
			if (page == presentationData.slidesCount) return;
			
			// Перелистывание страниц при нажатии на слайд
			$('#slide').css('cursor', 'pointer').click(function() {
				Router.redirect('item/'+presentationId+'/'+(page+1));
			});
		},
		
		/**
		 * Компилирует все шаблоны и сохраняет их в this.templates
		 */
		compileTemplates: function() {
			$('script[type="text/jade"]').each(function() {
				App.templates[this.id] = jade.compile(this.innerHTML);
			});
		},
		
		/**
		 * Рендерит шаблон
		 * @var $element Элемент куда будет вставляться полученный HTML
		 * @var templateName Название шаблона
		 * @var data Данные для передачи в шаблон
		 */
		render: function($element, templateName, data) {
			if (!this.templates[templateName]) throw('render: invalid template name');
			if (!($element instanceof jQuery)) $element = $($element);
			$element.empty().append(this.templates[templateName](data));
		}
	};

	App.init();
});
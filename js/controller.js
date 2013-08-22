$(function() {
	alert($('#layout').html());
	$('body').append(jade.compile($('#layout').html()));
});
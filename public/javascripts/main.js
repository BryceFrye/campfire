// var socket = io.connect('http://koutani-campfire.jit.su');
var socket = io.connect('http://localhost:8080');

var roomTemplate = _.template($('#chatroom_template').html());
var tabTemplate = _.template($('#tab_template').html());
var currentUser;

socket.on('connect', function(){
  $("#background_modal").fadeIn();
  $("#signin_modal").fadeIn();
  $("#signin_name").focus();
});

socket.on('alertDuplicateUsername', function(username){
  if ($("#signin_modal input").val() === username){
    $("#signin_error").show();
  }
});

socket.on('alertDuplicateRoomname', function(roomname){
  if ($("#new_room_modal input").val() === roomname){
    $("#new_room_error").show();
  }
});

socket.on('updateUsers', function(data, username){
  if (username === currentUser){
    $("#loading_container").hide();
    $("#background_modal").fadeOut();
    $("#signin_modal").fadeOut();
    $("#main_container").show();
  }
	$('#users').empty();
	var user_count = 0;
	$.each(data, function(key, value) {
		var color = key === currentUser ? "username_blue" : "username_black";
		user_count++;
		$('#users').append('<div class="'+ color +'">'+ key +'</div>');
	});
	$("#user_count").html(user_count + (user_count === 1 ? " person" : " people"));
});

socket.on('updateUsersInRoom', function(chatroom, users, username){
  var underscored_room_name = underscoreText(chatroom);
  if (username === currentUser){
    $(".nav-tabs").append(tabTemplate({ room: underscored_room_name, room_name: chatroom }));
    $("#right_container").append(roomTemplate({ room: underscored_room_name }));
    refreshTabs();
    setupChatroom(underscored_room_name);
  }
	$('#room_'+ underscored_room_name +' .chatroom_users').empty();
	if (users){
	  $.each(users, function(index, user){
      var color = user === currentUser ? "username_blue" : "username_black";
      $('#room_'+ underscored_room_name +' .chatroom_users').append('<div class="'+ color +'">'+ user +'</div>');    
    });
	}
});

socket.on('updateChat', function(chatroom, username, data, media){
	var color = username === currentUser ? "username_blue" : "username_black";
	$('#room_'+ chatroom +' .conversation').append('<span class="bold '+ color +'">'
	+ username +':</span> '+ data +'<br />');
	$("#room_"+ chatroom +" .conversation").scrollTop($("#room_"+ chatroom +
	" .conversation").scrollHeight);
	if (media){
		$('.media_link').click(function(){
  	  $("#room_"+ chatroom +" .media_container").html('<img src="'+ this.getAttribute("data-url") +'" />');
  	});
	}
});

socket.on('updateRooms', function(roomnames, username){
  if (username === currentUser){
    $("#background_modal").fadeOut();
    $("#new_room_modal").fadeOut();
    $("#new_room_error").hide();
    $("#new_room_name").val('');
  }
	$('#rooms').empty();
  $.each(roomnames, function(key, value) {
    var underscored_room_name = underscoreText(key);
		$('#rooms').append('<h4 id="room_'+ underscored_room_name +'"><a>'+ key + '</a></h4>');
		$('h4#room_'+underscored_room_name).click(function(){
		  socket.emit('joinRoom', key);
      if ($("li#room_"+underscored_room_name).length === 0){
        $(".nav-tabs").append(tabTemplate({ room: underscored_room_name, room_name: key }));
        $("#right_container").append(roomTemplate({ room: underscored_room_name }));
        refreshTabs();
        setupChatroom(underscored_room_name);
      }
		});
	});
});

function refreshTabs(){
  $(".nav-tabs li:last").click(function(){
    $(".nav-tabs li.active").removeClass("active");
    $(this).addClass("active");
    $(".chat_room.visible").removeClass("visible");
    $(".chat_room#"+this.id).addClass("visible");
  });
}

function setupChatroom(underscored_room_name){
	$('#room_'+ underscored_room_name +'.data_send').click(function(){
		var message = $('#room_'+ underscored_room_name +'.data').val();
		var chatroom = underscored_room_name;
		$('#room_'+ underscored_room_name +'.data').val('');
		socket.emit('sendChat', chatroom, message);
	});

  $('#room_'+ underscored_room_name +'.data').keypress(function(e){
   if(e.which === 13){
     $(this).blur();
     $('#room_'+ underscored_room_name +'.data_send').focus().click();
   }
  });

	$('#room_'+ underscored_room_name +'.media_send').click(function(){
		var media = $('#room_'+ underscored_room_name +'.media_url').val();
		var message = "posted <span class='media_link' data-url='"+ media +"'>something</span>.";
		var chatroom = underscored_room_name;
		$('#room_'+ underscored_room_name +'.media_url').val('');
		socket.emit('sendChat', chatroom, message, media);
	});

  $('#room_'+ underscored_room_name +'.media_url').keypress(function(e){
   if(e.which === 13){
     $(this).blur();
     $('#room_'+ underscored_room_name +'.media_send').focus().click();
   }
  });
  
  $("li#room_"+ underscored_room_name +" .btn").click(function(){
    socket.emit('leaveRoom', this.getAttribute("data-room_name"));
    $("li#room_"+underscored_room_name).remove();
    $("#room_"+underscored_room_name+".chat_room").remove();
    if ($(".active").length === 0){
      $("li#active_chat_rooms").addClass("active");
      $("#active_chat_rooms.chat_room").addClass("visible");
    }
  });

	// $("li#room_"+ underscored_room_name).click(function(){
	// 	$("#users_container").hide("slide", { direction: "left" }, 500);
	// });
}

function underscoreText(text){
  var altered_room_characters = [];
  for (var i = 0; i < text.length; i++){
    var x = text.charCodeAt(i);
    if((x==32)||(x>64&&x<91)||(x>96&&x<123)||(x>127&&x<155)||(x>159&&x<166)){
      altered_room_characters.push(text[i]);
    }
  }
  var underscored_room_name = altered_room_characters.join("").split(" ").join("_");
  return underscored_room_name;
}

$(function(){
  refreshTabs();
  
  $("#signin_name").keypress(function(e){
    if(e.which === 13){
      currentUser = $("#signin_name").val();
      socket.emit('addUser', currentUser);
    }
  });
  
  $("#new_room_button").click(function(){
    $("#background_modal").fadeIn();
    $("#new_room_modal").fadeIn();
    $("#new_room_name").focus();
  });
  
  $("#new_room_name").keypress(function(e){
    if(e.which === 13){
      room_name = $("#new_room_name").val();
      socket.emit('createRoom', room_name);
    }
  });

	$("#background_modal").click(function(){
		$(".info_modal_name").focus();
	});
	
	$(".info_modal").click(function(){
		$(".info_modal_name").focus();
	});
	
	// $("li#active_chat_rooms").click(function(){
	// 	$("#users_container").show("slide", { direction: "left" }, 500);
	// });
});
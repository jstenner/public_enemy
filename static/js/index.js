/**
 * Created by jstenner on 7/14/16.
 */


/*if(bowser.webkit){
    alert("WEBKIT");
}
if(bowser.mobile){
    alert("MOBILE");
}*/

var audioOn = false;

function preload(arrayOfImages) {
    $(arrayOfImages).each(function () {
        $('<img/>')[0].src = this;
        // Alternatively you could use:
        // (new Image()).src = this;
    });
}

// Usage:
$(window).load(function () {
    preload([
        'img/bigframe.png',
        'img/Jamie.gif',
        'img/Lloyd.gif',
        'img/title.png',
        'img/title-over.png'
    ]);
});

$(document).ready(function () {

    $('#letsrumble').click(function () {
        $('.nfoPanel').slideToggle("slow", "swing");
        if(feedbackActivated){
            $('.feedbackPanel').slideUp("slow", "swing");
        }
    });

    $('#closer').click(function () {
        $('.nfoPanel').slideToggle("slow", "swing");
    });

    $('.instBtn').click(function () {
        $('.instructions').slideToggle("slow", "swing");
        $('.twitter').hide();
        $('.information').hide();
        $('.texts').hide();
        $('.chooser').hide();
    });

    $('.infoBtn').click(function () {
        $('.information').slideToggle("slow", "swing");
        $('.instructions').hide();
        $('.twitter').hide();
        $('.texts').hide();
        $('.chooser').hide();
    });

    $('.txtBtn').click(function () {
        $('.texts').slideToggle("slow", "swing");
        $('.information').hide();
        $('.instructions').hide();
        $('.twitter').hide();
        $('.chooser').hide();
    });

    $('.twitBtn').click(function () {
        $('.twitter').slideToggle("slow", "swing");
        $('.instructions').hide();
        $('.information').hide();
        $('.texts').hide();
        $('.chooser').hide();
    });

    $('.chooseBtn').click(function () {
        $('.chooser').slideToggle("slow", "swing");
        $('.instructions').hide();
        $('.twitter').hide();
        $('.information').hide();
        $('.texts').hide();
    });

    $('#soundBtn').click(function () {
        if (audioOn) {
            stopAudio();
            audioOn = false;
            //$('#soundBtn').toggleClass('fa fa-volume-off fa-2x');
            $('#soundBtn').removeClass('fa-volume-up');
            $('#soundBtn').addClass('fa-volume-off');
        } else {
            startAudio();
            audioOn = true;
            //$('#soundBtn').toggleClass('fa fa-volume-on fa-2x');
            $('#soundBtn').removeClass('fa-volume-off');
            $('#soundBtn').addClass('fa-volume-up');
        }
        ;
    });

    $('.enterBtn').click(function () {
        $('#frame').show(1500);
        $('#soundBtn').show();
    });

    $('.rncBtn').click(function () {
        $('.nfoPanel').slideToggle("slow", "swing");
        chooseParty("RNC");
    });

    $('.dncBtn').click(function () {
        $('.nfoPanel').slideToggle("slow", "swing");
        chooseParty("DNC");
    });

    $('.bothBtn').click(function () {
        $('.nfoPanel').slideToggle("slow", "swing");
        chooseParty("BOTH");
    });

    $('.dumpBtn').click(function () {
        $('.nfoPanel').slideToggle("slow", "swing");
        toggleMode();
    });

    function showPE() {
        $.getScript('js/main.js');
    };

    $(".btn-start").click(function () {
        // give it time to scroll to "rumble" before initiating the load
        setTimeout(showPE, 2000);
    });

    $(".feedbackPanel").click(function () {
        $('.feedbackPanel').slideUp("slow", "swing");
    });

    if (bowser.mobile || bowser.tablet) {

        alert("You appear to be accessing The Public Enemy using a mobile device. If you are connected to the network via cellular, it is likely the application will not work unless your connection is really fast. Please connect to WiFi (if available), close and reopen the page to try again. Thanks!");

        $('#img1').click(function (e) {
            $('#img1').tooltip('show');
            var trg = e.target;
            setTimeout(function() {
                $(trg).tooltip('hide');
            }, 3000);
        });
        $('#img2').click(function (e) {
            $('#img2').tooltip('show');
            var trg = e.target
            setTimeout(function() {
                $(trg).tooltip('hide');
            }, 3000);
        });

    } else {
        $(function () {
            $('[data-toggle="tooltip"]').tooltip();
        });
    }

});


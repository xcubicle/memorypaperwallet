(function(global) {
  "use strict";
  let GLOBAL_SHARE_COUNTER = 0;
  const chrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
  if (!chrome) {
      $('#login-box input').each(function() {
        $(this).attr('disabled','disabled');  
      });
      $('#result').remove();
      alert('This wallet ONLY works on chrome');
  }

  const ELEMENT_VARS = {
    runWrapper: '.x-login',
    username: '#xprime',
    password: '#salt',
    btcPub: '#btcpub',
    btcPri: '#btcpri',
    nxtPub: '#nxtacct',
    nxtPri: '#nxtpri'
  };

  const createdDate = new Date().toJSON().slice(0,10);

  showEncryption('default');
  uploadImage();

  secretJS();

  function secretJS() {
    $('.secret-share-btn').on('click',function(event) {
      event.preventDefault();
      $(this).next().toggle();
    });

    $('.secret-share-form .split').on('click', function(event) {
      event.preventDefault();
      $('#threshold-error').remove();
      const _this = $(this),
            _form = _this.parent(),
            _wallet = _this.parent().parent(),
            _enableShareBtn = _this.parent().parent().find('.secret-share-btn'),
            privateKey = _wallet.find('.pri-text').text(),
            shareValue = _form.find('.shares').val() * 1,
            thresholdValue = _form.find('.threshold').val() * 1;

      // Doesn't make sense to have threshold > shares
      if(thresholdValue > shareValue) return _this.after('<div id="threshold-error" style="color: red;">Threshold can\'t be bigger than shares.</div>');

      if(privateKey && shareValue && thresholdValue) {
        if(!secrets && typeof secrets != 'object') return; //Make sure secret library is included
        const shares = secrets.share(secrets.str2hex(privateKey),shareValue,thresholdValue);
        for(let i = 0; i < shareValue; i++) {
          let label = i + 1,
              clonedWallet = _wallet.clone().addClass(`cloned`);

          cloneWallet(_wallet, clonedWallet, label, shareValue, shares[i]);
        }
        //remove the form, we don't want users to make multiple splits on one coin.
        _form.remove(); 
        _enableShareBtn.remove();
      }
    });
  }//func secretJS

  function cloneWallet(originalWallet, clonedWallet, label, maxShare, share) {
    const wallet = clonedWallet,
          priKeySelector = $('.pri-text', wallet).attr('id'),
          qrSelector = $('.qr-image.qr-pri', wallet).attr('id'),
          newPriKeySelector = `${priKeySelector}-shares-${label}`,
          newqrSelector = `${qrSelector}-shares-${label}`;
          
    $('.secret-share-form, .secret-share-btn', wallet).remove();
    $(`#${qrSelector}`, wallet).html('');
    $(`#${priKeySelector}`, wallet).attr('id', newPriKeySelector);
    $(`#${qrSelector}`, wallet).attr('id', newqrSelector);
    $('.upload', wallet).after(`<span class="share-counter">${label}/${maxShare}</span>`);
    originalWallet.after(wallet);
    
    $(`#${newPriKeySelector}`).text(share);
    makeQRImage(newqrSelector, share);
  }

  $('#btn').click(function(event) {
    event.preventDefault();
    $('.tos-container').show();
    $('body').addClass('tos-show');
  });

  $('.tos-footer button').click(function(event) { 
    event.stopPropagation();
    $('.tos-container').hide();
    $('body').removeClass('tos-show');
    generateCoins();
  });

  function generateCoins() {
    let power = $('input[name="power-level"]:checked').val();;
    setResult('.date','Created ' + createdDate);
    const params = {
      power: power,
      currency: 'bitcoin',
      privateKey: null,
      altCoin: false
    };

    generate(params, result => {
      setResult('#btcpub', result.public);
      setResult('#btcpri', result.private);
      drawIdenticon(`.i-btc`, result.public);
      makeQRImage(`qr-btcpub`, result.public);
      makeQRImage(`qr-btcpri`, result.private);

      const addedSalt = $('#salt').val();
      const publicKey = createNXT(addedSalt + result.private).publicKey;
      let address = createNXT(addedSalt + result.private).accountID;
      address = address.replace('NXT', 'ARDOR');

      const passphrase = addedSalt + result.private;
      $(ELEMENT_VARS.nxtPub).html(address);
      $(ELEMENT_VARS.nxtPri).html(passphrase);
      drawIdenticon(`.i-nxt`, address);
      makeQRImage(`qr-nxtacct`, address);
      makeQRImage(`qr-nxtpri`, passphrase);
      generateAltCoins(result.private, power);
    }); 
  }

  function generateAltCoins(privateKey, power) {
    // total of 4 alt coins
    const altCoins = ['litecoin', 'ethereum', 'segwit', 'monero'];
    const params = {
      power: power,
      currency: null,
      privateKey: privateKey,
      altCoin: true
    };
    for (let altcoin of altCoins) {
      let alt = altCoinCode(altcoin);
      params.currency = altcoin;
      $('#progress center').text('Generating alt coins...');
      generate(params, result => {
      	drawIdenticon(`.i-${alt}`, result.public);

        if (alt && alt !== 'xmr') {
          setResult(`#${alt}pub`, result.public);
          setResult(`#${alt}pri`, result.private);
          makeQRImage(`qr-${alt}pub`, result.public);
          makeQRImage(`qr-${alt}pri`, result.private);
        } else {
          setResult(`#xmrpub`, result.public);
          // setResult(`#xmrpub-spend`, result.public_spend);
          setResult(`#xmrpri-spend`, '<strong><sup>SPEND</sup></strong>' + result.private_spend);
          // setResult(`#xmrpub-view`, result.public_view);
          setResult(`#xmrpri-view`, '<strong><sup>VIEW</sup></strong>' + result.private_view);

          makeQRImage(`qr-xmrpub`, result.public);
          // makeQRImage(`qr-xmrpub-spend`, result.public_spend);
          makeQRImage(`qr-xmrpri-spend`, result.private_spend);
          // makeQRImage(`qr-xmrpub-view`, result.public_view);
          makeQRImage(`qr-xmrpri-view`, result.private_view);
          $('#result').toggle();
          $('#login-box').toggle();
          $('.result-btn').toggle();
        }
      });
    }
  }

  (function rerun() {
    $('.rerun-btn').on('click', function() {
      const answer = confirm("Make sure to save your current wallet.");
      if (answer) {
        $('.result-btn').toggle();
        $('#result').toggle();
        $('#login-box').toggle();
        $('#login-box .form-control').val('');
        $('#login-box fieldset').attr('disabled', false);
        $('#btn').show();
        $('.qr-image').html('');
        $('.identicon').html('');
        $('.cloned').remove();
      }
    });
  })();

  (function print() { 
    $('.print').on('click', function() { 
      global.print();
    });
  })();

  (function encryptionStatus() {
    $('#lvl-wrap .power-level').on('click', function() {
      const power = $('input[name="power-level"]:checked').val();
      showEncryption(power);
    });
  })();

  function showEncryption(power) {
    let spow, spow2, pText, sText, pPower, sPower;
    sPower = power;
    pPower = 16;

    if (sPower == 'default') {
      spow = 262144;
      spow2 = 65000;
      pText = sText = 'default';
    } else if(sPower == 'Offline Hardened') { 
      spow = 2097152;
      spow2 = 256000;
      pText = sText = 'Offline Hardened';
    } else {
      spow = Math.pow(2, parseInt(sPower));
      spow2 = Math.pow(2, pPower);
      pText = pPower;
      sText = sPower;
    }

    //Detect custom hash for setting power levels
    var urlhash = new RegExp('[\?&]lvl=([^&#]*)').exec(global.location.href);
    if ((urlhash != null)) {
      let lvl = decodeURI(urlhash[1]) || 0;
      sText = pText = 'custom';
      sPower = lvl.substring(0, 2);
      spow = Math.pow(2, sPower);
      spow2 = parseInt(lvl.substring(2, 9)) || 65536;
    }

    $('#lvl-scrypt').text(`scrypt: ${sText} =  ${spow}`);
    $('#lvl-pbkdf2').text(`pbkdf2: ${pText} = ${spow2}`);
  }

  function setResult(selector, value) {
    $(`${selector}`).html(value);
  }

  function createNXT(value) {
    const nxtPairs = {};
    nxtPairs.accountID = nxtjs.secretPhraseToAccountId(value);
    nxtPairs.publicKey = nxtjs.secretPhraseToPublicKey(value);
    return nxtPairs;
  }

  function altCoinCode(altcoin) {
    switch (altcoin) {
      case 'litecoin':
        return 'ltc';
      case 'ethereum':
        return 'eth';
      case 'segwit':
        return 'seg';
      case 'monero':
        return 'xmr';
    }
    return '';
  }

  function makeQRImage(IDSelector, text, width = 111, height = 111) {
    new QRCode(IDSelector, {
      text: text,
      width: width,
      height: height
    });
  }

  function drawIdenticon(selector, value, size=40) {
  	const svg = jdenticon.toSvg(value,size);
  	$(selector).append(svg);
  }

  function uploadImage() {
    $(document).on('click','.upload',function () {
      const $bgImage = $(this).parent().find('.wallet-bg');
      const $uploadInput = $(this).find('input[type="file"]');
      $uploadInput.change(function(e) {
        const reader = new FileReader();
        reader.onload = function(){
          $bgImage.attr('src',reader.result);
        };
        reader.readAsDataURL(e.target.files[0]);
      });
    });
  } 
  
  $("#expert").click(function() {
    $("#levels").toggle();
  });

  $(".upload button").click(function() {
    $(this).parent().parent().fadeOut(888);
  });

})(window);

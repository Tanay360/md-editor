<script context="module" lang="ts">
	export const prerender = true;
</script>

<script lang="ts">
	import { Tooltip, AppBar, Button, Icon, Menu, ListItem, MaterialApp, Dialog, Snackbar, Overlay, ProgressCircular } from 'svelte-materialify';
	import { mdiDotsVertical, mdiCodeTags, mdiClose, mdiArrowLeft } from '@mdi/js';
	import hljs from 'highlight.js';
	import ObservableSlim from 'observable-slim/observable-slim.js';
	import mdFun from 'markdown-it';
	import { onMount } from 'svelte';
	import { browser } from '$app/env';
	import { MarkdownDatabase, type MarkdownItem } from "$lib/db";
    import { wordsToNumbers } from "$lib/word-to-num";


    function getParameterByName(name: string, url: string = window.location.href): string {
        name = name.replace(/[\[\]]/g, '\\$&');
        var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, ' '));
    }

    const close = () => {
        window.location.href = '/'
    }

    let title = 'Markdown Editor';
	const md = mdFun({
		html: true,
        linkify: true,
        typographer: true,
		highlight: function (str: string, lang: string) {
			if (lang && hljs.getLanguage(lang)) {
			try {
				return '<pre class="hljs"><code>' +
					hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
					'</code></pre>';
			} catch (__) {}
			}

			return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
		}
	})

	let editorEl: HTMLDivElement
	let iframeValue = {
		html: '<h1>Markdown Editor</h1>'
	}

	let showDeleteDialog = false;
	let completeCode = ''
	let showOverlayProgressIndicator = false
	let isOverlayCancelable = true;
	const closeOverlay = () => {
		if (isOverlayCancelable) {
			showOverlayProgressIndicator = false
		}
	}

	let iframeOutput: HTMLIFrameElement

	const addSpace = (e: KeyboardEvent) => {
		if (e.key == 'Tab') {
			e.preventDefault();  // this will prevent us from tabbing out of the editor
			// now insert four non-breaking spaces for the tab key
			var doc = editorEl.ownerDocument.defaultView;
			var sel = doc.getSelection();
			var range = sel.getRangeAt(0);
			var tabNode = document.createTextNode("\u00a0\u00a0\u00a0\u00a0");
			range.insertNode(tabNode);
			range.setStartAfter(tabNode);
			range.setEndAfter(tabNode); 
			sel.removeAllRanges();
			sel.addRange(range);

  		}
	}

	function fallbackCopyTextToClipboard(text: string) {
		var textArea = document.createElement("textarea");
		textArea.value = text;
		
		// Avoid scrolling to bottom
		textArea.style.top = "0";
		textArea.style.left = "0";
		textArea.style.position = "fixed";

		document.body.appendChild(textArea);
		textArea.focus();
		textArea.select();

		try {
			var successful = document.execCommand('copy');
			var msg = successful ? 'successful' : 'unsuccessful';
			console.log('Fallback: Copying text command was ' + msg);
		} catch (err) {
			console.error('Fallback: Oops, unable to copy', err);
		}

		document.body.removeChild(textArea);
	}
	function copyTextToClipboard(text: string) {
		if (!navigator.clipboard) {
			fallbackCopyTextToClipboard(text);
			return;
		}
		navigator.clipboard.writeText(text).then(function() {
			console.log('Async: Copying to clipboard was successful!');
		}, function(err) {
			console.error('Async: Could not copy text: ', err);
		});
	}

	enum Mode {
		Dark = 1,
		Light = 0
	}

	let snackBarActive = false;
	let snackBarText = ''

	const showSnackBar = (text: string) => {
		snackBarText = text
		snackBarActive = true
	}

	let showCodeDialog = false;

	const openShowCodeDialog = () => {
		showCodeDialog = true;
	}

	const copyCode = () => {
		copyTextToClipboard(completeCode)
		showCodeDialog = false;
		showSnackBar('Code Copied to clipboard!')
	}
	function yyyymmdd(date: Date) {
		var mm = date.getMonth() + 1; // getMonth() is zero-based
		var dd = date.getDate();

		return [date.getFullYear(),
				(mm>9 ? '' : '0') + mm,
				(dd>9 ? '' : '0') + dd
				].join('-');
	};

	const mdToPdf = async () => {
		isOverlayCancelable = true;
		showOverlayProgressIndicator = true;
		try {
			const res = await fetch('html-to-pdf', {
				method: 'POST',
				body: completeCode
			})
			const blob = await res.blob()
			const newBlob = new Blob([blob]);
			const blobUrl = window.URL.createObjectURL(newBlob);

			const link = document.createElement('a');
			link.href = blobUrl;
			link.setAttribute('download', `${yyyymmdd(new Date())}.pdf`);
			document.body.appendChild(link);
			link.click();
			link.parentNode.removeChild(link);

			// clean up Url
			window.URL.revokeObjectURL(blobUrl);
		} finally {
			showOverlayProgressIndicator = false;
		}		
	}

	let db: MarkdownDatabase; 
	let itemId: number;

	onMount(async () => {
		if (browser) {
            const id = getParameterByName('id')
            if (id == null || typeof id === "undefined") {
                showSnackBar('Id is null!')
                setTimeout(close, 3000);
            }
			db = new MarkdownDatabase();
            let item: MarkdownItem | null = null
            try {
                const idN = wordsToNumbers(id)
                const idInNumber = typeof idN === "string" ? parseInt(idN): idN;
                item = await db.loadMarkdownItemById(idInNumber)
                if (item == null || typeof item === "undefined") {
                    throw 'Item is null!';
                }
            } catch (e) {
                console.error(e);
                showSnackBar('Failed to load item!');
                setTimeout(close, 3000);
                return;
            }
			itemId = item.id;
            title = `Edit Item ${item.id}`;
            editorEl.innerHTML = item.data;
			iframeValue.html = md.render(editorEl.innerText);
			iframeOutput.contentWindow.document.open()
			const htmlEl = document.createElement('html')
			const headEl = document.createElement('head')
			headEl.innerHTML = '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Microsoft/vscode/extensions/markdown-language-features/media/highlight.css">';
			const styleEl = document.createElement('style')
			styleEl.innerHTML = '@import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono&display=swap");' + ".vscode-dark code, .vscode-dark pre { background: #333; color: #fff; }" + '\n' + 'pre { padding: 10px; white-space: pre-wrap; overflow: hidden; }' + '\n' + "pre, code { font-family: 'JetBrains Mono', monospace; }"
			headEl.appendChild(styleEl)
			htmlEl.appendChild(headEl)
			const bodyEl = document.createElement('body')
			bodyEl.classList.add('vscode-dark');
			const mainEl = document.createElement('main')
			bodyEl.appendChild(mainEl);
			htmlEl.appendChild(bodyEl);
			mainEl.innerHTML = iframeValue.html
			iframeOutput.contentWindow.document.appendChild(htmlEl)
			completeCode = '<!DOCTYPE html>\n<html>\n' + htmlEl.innerHTML + '</html>'
			iframeValue = ObservableSlim.create(iframeValue, true, function() {
				mainEl.innerHTML = iframeValue.html;
				completeCode = '<!DOCTYPE html>\n<html>\n' + htmlEl.innerHTML + '</html>'
			});
			const observer = new MutationObserver(function() {
                db.updateMarkdownItem(item.id, editorEl.innerHTML);
				iframeValue.html = md.render(editorEl.innerText);
			});
			observer.observe(editorEl, {characterData: true, subtree: true, childList: true});
		}	
	});

	
	let backgroundMode = Mode.Dark
	
	const toggleMode = () => {
		if (backgroundMode == 1) {
			backgroundMode = Mode.Light
			iframeOutput.contentWindow.document.querySelector('body').classList.replace('vscode-dark', 'vscode-light')
		} else {
			backgroundMode = Mode.Dark
			iframeOutput.contentWindow.document.querySelector('body').classList.replace('vscode-light', 'vscode-dark')
		}
	}

	const callDeleteDialog = () => showDeleteDialog = true;
	const closeDeleteDialog = () => showDeleteDialog = false;

	const deleteItem = async () => {
		closeDeleteDialog()
		isOverlayCancelable = false;
		showOverlayProgressIndicator = true;
		await db.deleteMarkdownItem(itemId);
		showOverlayProgressIndicator = false;
		close()	
	}

    const closeSnackBar = () => snackBarActive = false;

</script>

<svelte:head>
	<title>Markdown Editor</title>
	<meta name="keywords" content="Markdown Editor, Tanay Develops">
	<meta name="description" content="Markdown Editor by Tanay Develops is an online editor where you can write your markdown code, and the editor will render it in html. The html can be copied as well as converted to pdf in the editor only! ">
</svelte:head>

<MaterialApp theme="light">
	<AppBar style="background: #7fffd4" class="pa-2">
        <div slot="icon">
            <Tooltip bottom>
                <Button fab class="transparent" depressed on:click={close}>
                    <Icon path={mdiArrowLeft}/>
                </Button>
                <span slot="tip">Go Up</span>
            </Tooltip>
        </div>
		<span slot="title" class="bold">{title}</span>
		<div style="flex-grow:1" />
		<Tooltip bottom>
			<Button fab class="transparent" on:click={openShowCodeDialog} depressed>
				<Icon path={mdiCodeTags}/>
			</Button>
			<span slot="tip">Show HTML</span>	
		</Tooltip>
		<Menu right>
		  <div slot="activator">
			<Tooltip bottom>
				<Button fab depressed class="transparent">
					<Icon path={mdiDotsVertical} />
				</Button>
				<span slot="tip">More Options</span>	
			</Tooltip>
		  </div>
		  <ListItem on:click={mdToPdf}>Convert to PDF</ListItem>
		  <ListItem on:click={toggleMode}>
				{#if backgroundMode == 0}
			  		Dark Mode
				{:else}
					Light Mode
				{/if}
		  </ListItem>
		  <ListItem on:click={callDeleteDialog}>Delete Item</ListItem>
		  <ListItem on:click={function () { window.open('https://tanaydevelops.in/contact', '_blank') }}>Contact Me</ListItem>
		</Menu>
	  </AppBar>	  
	<main>
		<div class="editor" contenteditable bind:this={editorEl} spellcheck="false" on:keydown={addSpace}>
			# Markdown Editor
		</div>
		<div class="divider"></div>
		<div class="preview">
			<iframe src="" frameborder="0" title="" bind:this={iframeOutput}></iframe>
		</div>
	</main>
	<Dialog class="pa-4 dialog-box" bind:active={showCodeDialog}>
		<div style="white-space: pre-line;">
			{completeCode}
		</div>
		<Button class="mt-8 green white-text" on:click={copyCode}>Copy Code</Button>
	</Dialog>
	<Dialog class="pa-4 center-text" bind:active={showDeleteDialog}>
		<span class="dialog-heading">Do you really want to delete this item? This is not reversible!</span>
		<div class="d-flex pt-8">
			<Button class="yellow">No</Button>
			<Button class="blue white-text" style="margin-left: 65%;" on:click={deleteItem}>Yes</Button>
		</div>
	</Dialog>
	<Snackbar class="justify-space-between" bind:active={snackBarActive} right top timeout={3000}>
		{snackBarText}
		<Button on:click={closeSnackBar} class="transparent">
			<Icon path={mdiClose}/>
		</Button>
	</Snackbar>			
	<Overlay bind:active={showOverlayProgressIndicator} on:click={closeOverlay}>
		<ProgressCircular indeterminate color="primary" size={60}/>
	</Overlay>
</MaterialApp>


<style>
	@import url('https://fonts.googleapis.com/css2?family=Roboto&display=swap');

	.bold {
		font-weight: 600;
	}

	.dialog-heading {
		font-size: calc(1rem + 0.5vw);
	}

	main {
		display: flex;
		width: 100%;
		height: 100vh;
		flex-direction: column;
	}

	div.divider {
		width: 100%;
		height: 2px;
		background-color: gray;
	}

	div.editor {
		font-family: 'Roboto', sans-serif;
	}

	div.editor:focus, div.editor:active { 
		border: 0px;
		outline: 0px;
	}

	main > div.editor, main > div.preview {
		padding: 1vw;
		flex: 1;
		width: 100%;
	}
	.preview > iframe{
		width: 100%;
		height: 100%;
	}

	@media (min-width: 600px) {
		main {
			height: 100%;
			flex-direction: row;
		}
		div.divider {
			height: 100%;
			width: 2px;
		}

		main > div.editor, main > div.preview {
			padding: 1vw;
			flex: 1;
			height: 100%;
			max-width: 50%;
		}		
	}
</style>

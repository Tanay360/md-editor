<script context="module" lang="ts">
	export const prerender = true;
</script>

<script lang="ts">
	import { Tooltip, AppBar, Button, Icon, Menu, ListItem, MaterialApp, ProgressCircular, Card, Col, CardTitle, CardSubtitle, TextField } from 'svelte-materialify';
	import { onMount } from 'svelte';
	import { browser } from '$app/env';
	import { MarkdownDatabase } from "$lib/db";
	import type { MarkdownItem } from "$lib/db";
	import { toWords } from 'number-to-words';
	import { mdiDotsVertical, mdiPlus } from '@mdi/js';

	let items: MarkdownItem[] | null = null

	let db: MarkdownDatabase
	onMount(async () => {
		if (browser) {
			db = new MarkdownDatabase()
			items = await db.loadAllMarkdownItems()
		}	
	});

	let searchValue = ''

	const openItem = (id: number) => {
		window.location.href = `editor?id=${toWords(id)}`
	}

	const createNewItem = async () => {
		const id = await db.putMarkdownItem('# Markdown Editor') as number
		openItem(id)
	}

	function htmlToText(html: string): string {
		var temp = document.createElement('div');
		temp.innerHTML = html;
		return temp.textContent; // Or return temp.innerText if you need to return only visible text. It's slower.
	}

	$: (async () => {
		if (db != null || typeof db !== "undefined") {
			items = await db.findMarkdownItemByName(searchValue);		
		}
	})()
</script>

<svelte:head>
	<title>Markdown Editor</title>
	<meta name="keywords" content="Markdown Editor, Tanay Develops">
	<meta name="description" content="Markdown Editor by Tanay Develops is an online editor where you can write your markdown code, and the editor will render it in html. The html can be copied as well as converted to pdf in the editor only! ">
</svelte:head>

<MaterialApp theme="light">
	<AppBar style="background: #7fffd4; width: 100%;" class="pa-2" fixed>
		<div slot="icon" class="app-bar-icon">
			<img src='favicon.png' alt='' />
		</div>
		<span class="bold title">Markdown Editor</span>
		<div style="flex-grow:1">
			<TextField class="ml-4 mr-4 mt-4" bind:value={searchValue}>
				<div class="d-flex transparent">
					<img src="search_black_24dp.svg" alt="Search">
					Search
				</div>
				
			</TextField>
		</div>
		<Menu right>
			<div slot="activator">
				<Tooltip bottom>
					<Button fab depressed class="transparent">
						<Icon path={mdiDotsVertical} />
					</Button>
					<span slot="tip">More Options</span>	
				</Tooltip>
			</div>
			<ListItem on:click={function () { window.open('https://tanaydevelops.in/contact', '_blank') }}>Contact Me</ListItem>
		</Menu>
	  </AppBar>	  
	<main class={items == null ? 'center-content mt-15': 'mt-15'}>
		{#if items == null}
			<ProgressCircular indeterminate color="primary" size={60}/>
		{:else}
			{#each items as item}
			<Card hover style="width: 100%; text-align: left;" flat>
				<Button tile style="width: 100%; height: unset; padding: 0; text-align: left;" on:click={() => openItem(item.id)}>
					<Col>
						<CardTitle style="text-transform: none;">Item {item.id}</CardTitle>
						<CardSubtitle style="text-transform: none;">{htmlToText(item.data)}</CardSubtitle>
					</Col>
				</Button>
			</Card>				
			{/each}
		{/if} 
	</main>
	<Button class="fab br-8" style="background: #7fffd4;" on:click={createNewItem}>
        <Icon path={mdiPlus}/>
        Create new Item
    </Button>
</MaterialApp>


<style>
	@import url('https://fonts.googleapis.com/css2?family=Roboto&display=swap');

	.bold {
		font-weight: 600;
	}
	.app-bar-icon img {
		max-width: 50px;
		max-height: 50px;
	}

	.title {
		font-size: calc(1rem + 0.5vw);
	}
	main {
		width: 100%;
		height: 100vh;
	}

	.center-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

</style>

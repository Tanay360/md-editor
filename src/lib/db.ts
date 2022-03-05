import Dexie, { type IndexableType } from 'dexie';
import { toWords } from 'number-to-words';

export class MarkdownDatabase extends Dexie {
    items!: Dexie.Table<MarkdownItem, number>;

    constructor () {
        super("MarkdownDatabase");
        this.version(1).stores({
            items: '++id, data',
        });
    }

    findMarkdownItemByName(name: string): Promise<MarkdownItem[]> {
        const array = this.table<MarkdownItem>("items").filter((item: MarkdownItem) => {
            return item.data.toLowerCase().includes(name.toLowerCase()) || (toWords(item.id) as string).toLowerCase().includes(name.toLowerCase()) || item.id.toString().includes(name)
        }).toArray()
        return new Promise(function(resolve: (items: MarkdownItem[]) => void, reject: (reason: any) => void) {
            array.then(resolve).catch(reject)
        })
    }

    putMarkdownItem(data: string): Promise<IndexableType> {
        const promise = this.table<MarkdownItem>("items").put({data: data});
        return new Promise(function(resolve: (value: IndexableType) => void, reject: (reason: any) => void) {
            promise.then(resolve).catch(reject)
        })
    }

    updateMarkdownItem(id: number, data: string): Promise<any> {
        const promise = this.table<MarkdownItem>("items").update(id, { data: data })
        return new Promise(function(resolve: (value: any) => void, reject: (reason: any) => void) {
            promise.then(resolve).catch(reject)
        })
    }

    loadAllMarkdownItems(): Promise<MarkdownItem[]> {
        const table = this.table<MarkdownItem>("items")
        return new Promise(function(resolve: (items: MarkdownItem[]) => void, reject: (reason: any) => void) {
            table.toArray().then(resolve).catch(reject)
        });
    }

    loadMarkdownItemById(id: number): Promise<MarkdownItem> {
        const table = this.table<MarkdownItem>("items")
        return new Promise(function(resolve: (item: MarkdownItem) => void, reject: (reason: any) => void) {
            table.get(id).then(resolve).catch(reject)
        })
    }

    deleteMarkdownItem(id: number): Promise<void> {
        const promise = this.table<MarkdownItem>("items").delete(id)
        return new Promise(function(resolve: (value: void) => void, reject: (reason: any) => void) {
            promise.then(resolve).catch(reject)
        })
    }
}

export interface MarkdownItem {
    id?: number,
    data: string
}
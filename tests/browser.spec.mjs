// Run in an environment with supported browsers. Not executed in the managed build environment.
import {test,expect} from '@playwright/test';
test('new game, interface, persistence and offline reload',async({page,context})=>{
 const critical=[];page.on('pageerror',e=>critical.push(e.message));
 await page.goto('/');await page.getByRole('button',{name:/Found your settlement/}).click();
 await expect(page.locator('canvas').first()).toBeVisible();
 await page.getByRole('button',{name:'Pause',exact:true}).click();
 await page.getByRole('button',{name:'Stewardship',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Stewardship',exact:true})).toBeVisible();
 await page.getByRole('button',{name:/Double/}).click();await page.getByRole('button',{name:'Close panel'}).click();
 await page.getByRole('button',{name:'Save, load and settings'}).click();
 await page.getByRole('button',{name:'Save to slot 1'}).click();
 await expect(page.getByText('Settlement saved.')).toBeVisible();
 await page.getByRole('button',{name:'Close panel'}).click();
 await page.evaluate(async()=>{await navigator.serviceWorker.ready});
 await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBeTruthy();
 expect(await page.locator('img').evaluateAll(images=>images.filter(im=>!im.complete||im.naturalWidth===0).map(im=>im.src))).toEqual([]);
 await page.screenshot({path:'reports/browser-desktop.png',fullPage:true});
 await context.setOffline(true);await page.reload();
 await expect(page.getByRole('button',{name:/Continue saved settlement/})).toBeVisible();
 await page.getByRole('button',{name:/Continue saved settlement/}).click();
 await expect(page.locator('canvas').first()).toBeVisible();expect(critical).toEqual([]);
});
test('tablet controls and save menu remain reachable',async({page})=>{
 await page.setViewportSize({width:1024,height:768});await page.goto('/');
 await page.getByRole('button',{name:/Found your settlement/}).click();
 await page.getByRole('button',{name:'Save, load and settings'}).click();
 await expect(page.getByRole('button',{name:'Export save file'})).toBeVisible();
 await page.screenshot({path:'reports/browser-tablet.png',fullPage:true});
});

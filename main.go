package main

import (
	"context"
	"fmt"
	"time"

	"github.com/chromedp/cdproto/cdp"

	"github.com/chromedp/chromedp"
)

func main() {
	// Uncomment to run NON-headless version with actual chrome window
	//
	allocatorOpts := []chromedp.ExecAllocatorOption{
		chromedp.NoFirstRun,
		chromedp.NoDefaultBrowserCheck,

		// chromedp.Flag("disable-background-networking", true),
		chromedp.Flag("enable-features", "NetworkService,NetworkServiceInProcess"),
		chromedp.Flag("disable-background-timer-throttling", true),
		// chromedp.Flag("disable-backgrounding-occluded-windows", true),
		// chromedp.Flag("disable-breakpad", true),
		chromedp.Flag("disable-client-side-phishing-detection", true),
		chromedp.Flag("disable-default-apps", true),
		chromedp.Flag("disable-dev-shm-usage", true),
		chromedp.Flag("disable-extensions", true),
		// chromedp.Flag("disable-features", "site-per-process,TranslateUI,BlinkGenPropertyTrees"),
		chromedp.Flag("disable-hang-monitor", true),
		chromedp.Flag("disable-ipc-flooding-protection", true),
		chromedp.Flag("disable-popup-blocking", true),
		chromedp.Flag("disable-prompt-on-repost", true),
		// chromedp.Flag("disable-renderer-backgrounding", true),
		// chromedp.Flag("disable-sync", true),
		chromedp.Flag("force-color-profile", "srgb"),
		chromedp.Flag("metrics-recording-only", true),
		// chromedp.Flag("safebrowsing-disable-auto-update", true),
		chromedp.Flag("enable-automation", true),
		chromedp.Flag("password-store", "basic"),
		chromedp.Flag("use-mock-keychain", true),
	}
	ctx, cancel := chromedp.NewExecAllocator(context.Background(), allocatorOpts...)
	//

	// ctx, cancel = context.WithTimeout(context.Background(), 20*time.Second)
	ctx, cancel = chromedp.NewContext(ctx)
	defer cancel()

	var nodes []*cdp.Node

	if err := chromedp.Run(ctx,
		chromedp.Navigate("https://finviz.com/screener.ashx?v=150&f=exch_nyse,geo_usa,sh_avgvol_150to1500,sh_price_3to10,ta_averagetruerange_o0.5,ta_perf_d5o&ft=4&o=-change&c=0,1,2,3,4,6,28,42,43,49,57,58,59,60,63,65,66,67"),
		chromedp.Sleep(time.Second*2),
		chromedp.WaitVisible(".screener-link-primary"),
		chromedp.Nodes(".screener-link-primary", &nodes, chromedp.ByQueryAll),
		// chromedp.Sleep(10*time.Second),
	); err != nil {
		fmt.Println("Cannot get data " + err.Error())

		return
	}
	for _, n := range nodes {
		fmt.Println(n.Children[0].NodeValue)

		// chromedp.Text()
		fmt.Println(n.Parent.Parent.Children[3]) // .Children[0].NodeValue
	}

	return
}

##CONTAINERS

There are various types of containers in the game, some of which have special properties.  All containers have their own weight and bulk, and a max weight and bulk they can contain.  If containers are nested then things get a little trickier, as there is also the weight and bulk they report to what is holding them.  In the case of bags, the bulk fluctuates with the contents, but for chests the bulk is fixed.  It is also possible to have containers with fixed weight.  The weight of a "pack of holding" is constant no matter what you put inside.  If non-zero, the Wt. Fx and Bulk Fx columns are used instead of the sum of the contents (plus whatever intrinsic weight and bulk the container has) in calculating the value reported to the parent.

Container	Wt	Bulk	Wt. Max	Bulk Max	Wt.Fx	Bulk Fx
Broken Pack 	1000	1000	0	0	0	0
Small Pack	1000	1000	12000	50000	0	0
Small Bag	300	500	5000	6000	0	0
Medium Pack	2000	1500	22000	75000	0	0
Medium Bag	500	700	 10000	12000	0	0
Small Chest	5000	10000	100000	50000	0	50000
Large Pack	4000	2000	35000	100000	0	100000
Large Bag	900	900	15000	18000	0	0
Medium Chest	15000	2000	100000	150000	0	150000
Large Chest	25000	4000	100000	250000	0	250000
Small Pack of Holding 	1000	1000	50000	150000	5000	75000
Medium Pack of Holding 	2000	1500	75000	200000	7500	100000
Large Pack of Holding 	4000	2000	100000	250000	10000	125000

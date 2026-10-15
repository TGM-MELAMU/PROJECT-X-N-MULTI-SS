<?php

declare(strict_types=1);

namespace MultiSS\Controllers;

use DomainException;
use InvalidArgumentException;
use LogicException;
use MultiSS\Core\Logger;
use MultiSS\Core\Response;
use OutOfBoundsException;
use Throwable;

abstract class MarketplaceController
{
    protected function respond(callable $callback, int $code = 200): void
    {
        try {
            Response::json(['success'=>true,'data'=>$callback()],$code);
        } catch (InvalidArgumentException $error) {
            Response::json(['success'=>false,'message'=>$error->getMessage()],422);
        } catch (OutOfBoundsException $error) {
            Response::json(['success'=>false,'message'=>$error->getMessage()],404);
        } catch (DomainException $error) {
            Response::json(['success'=>false,'message'=>$error->getMessage()],403);
        } catch (LogicException $error) {
            Response::json(['success'=>false,'message'=>$error->getMessage()],409);
        } catch (Throwable $error) {
            Logger::error('Marketplace request failed', ['type'=>$error::class,'message'=>$error->getMessage()]);
            Response::json(['success'=>false,'message'=>'Unable to complete this request.'],500);
        }
    }
}
